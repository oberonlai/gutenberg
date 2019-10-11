/**
 * External dependencies
 */
import {
	View,
	Text,
	TouchableWithoutFeedback,
} from 'react-native';

/**
 * WordPress dependencies
 */
import { Component } from '@wordpress/element';
import { ToolbarButton, Toolbar } from '@wordpress/components';
import { withDispatch, withSelect } from '@wordpress/data';
import { compose } from '@wordpress/compose';
import { getBlockType } from '@wordpress/blocks';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import styles from './block.scss';
import BlockEdit from '../block-edit';
import BlockInvalidWarning from './block-invalid-warning';
import BlockMobileToolbar from './block-mobile-toolbar';
import FloatingToolbar from './block-mobile-floating-toolbar';
import NavigateUpSVG from './nav-up-icon';

class BlockListBlock extends Component {
	constructor() {
		super( ...arguments );

		this.insertBlocksAfter = this.insertBlocksAfter.bind( this );
		this.onFocus = this.onFocus.bind( this );

		this.state = {
			isFullyBordered: false,
		};
	}

	onFocus() {
		const { firstToSelect, isSelected, onSelect, isParentSelected, isMediaText } = this.props;
		if ( ! isSelected ) {
			if ( ! isMediaText || ! isParentSelected ) {
				onSelect( firstToSelect );
			}
		}
	}

	insertBlocksAfter( blocks ) {
		this.props.onInsertBlocks( blocks, this.props.order + 1 );

		if ( blocks[ 0 ] ) {
			// focus on the first block inserted
			this.props.onSelect( blocks[ 0 ].clientId );
		}
	}

	getBlockForType() {
		return (
			<BlockEdit
				name={ this.props.name }
				isSelected={ this.props.isSelected }
				isParentSelected={ this.props.isParentSelected }
				attributes={ this.props.attributes }
				setAttributes={ this.props.onChange }
				onFocus={ this.onFocus }
				onReplace={ this.props.onReplace }
				insertBlocksAfter={ this.insertBlocksAfter }
				mergeBlocks={ this.props.mergeBlocks }
				onCaretVerticalPositionChange={ this.props.onCaretVerticalPositionChange }
				clientId={ this.props.clientId }
			/>
		);
	}

	renderBlockTitle() {
		return (
			<View style={ styles.blockTitle }>
				<Text>BlockType: { this.props.name }</Text>
			</View>
		);
	}

	getAccessibilityLabel() {
		const { attributes, name, order, title, getAccessibilityLabelExtra } = this.props;

		let blockName = '';

		if ( name === 'core/missing' ) { // is the block unrecognized?
			blockName = title;
		} else {
			blockName = sprintf(
				/* translators: accessibility text. %s: block name. */
				__( '%s Block' ),
				title, //already localized
			);
		}

		blockName += '. ' + sprintf( __( 'Row %d.' ), order + 1 );

		if ( getAccessibilityLabelExtra ) {
			const blockAccessibilityLabel = getAccessibilityLabelExtra( attributes );
			blockName += blockAccessibilityLabel ? ' ' + blockAccessibilityLabel : '';
		}

		return blockName;
	}

	applySelectedStyle() {
		const {
			isInnerBlock,
			isNestedInnerBlock,
			isGroupType,
		} = this.props;

		if ( isNestedInnerBlock || isGroupType ) {
			return styles.nestedFocusedBlock;
		}

		if ( isInnerBlock ) {
			return styles.innerBlockContainerFocused;
		}

		return styles.blockContainerFocused;
	}

	applyUnSelectedStyle() {
		const {
			isDashed,
			isDimmed,
			isNestedInnerBlock,
			isInnerBlock,
			isChildOfSameRootBlook,
			isGroupType,
			parentId,
		} = this.props;

		if ( ! isDashed && isInnerBlock && ! isChildOfSameRootBlook ) {
			return styles.blockContainerInner;
		}

		const defaultStyle = [ isDashed ? styles.blockHolderDashedBordered : styles.blockContainer ];

		if ( isNestedInnerBlock ) {
			if ( ! isDimmed || isDashed ) {
				return [ ...defaultStyle, styles.blockContainerInner ];
			}
			return [ ...defaultStyle, styles.nestedBlockContainerInner ];
		}

		if ( isGroupType && ( ! parentId || isChildOfSameRootBlook ) ) {
			return [ ...defaultStyle, styles.horizontalMarginNone ];
		}

		return defaultStyle;
	}

	render() {
		const {
			borderStyle,
			clientId,
			focusedBorderColor,
			icon,
			isSelected,
			isValid,
			showTitle,
			title,
			showFloatingToolbar,
			parentId,
			isFirstBlock,
			isDashed,
			isDimmed,
			isInnerBlock,
			isNestedInnerBlock,
			isGroupType,
		} = this.props;

		const borderColor = isSelected ? focusedBorderColor : 'transparent';

		const accessibilityLabel = this.getAccessibilityLabel();

		return (
			<>
				{ showFloatingToolbar && ( ! isFirstBlock || parentId === '' ) && <FloatingToolbar.Slot /> }
				{ showFloatingToolbar &&
					( <FloatingToolbar>
						<Toolbar passedStyle={ styles.toolbar }>
							<ToolbarButton
								title={ __( 'Navigate Up' ) }
								onClick={ () => this.props.onSelect( parentId ) }
								icon={ NavigateUpSVG }
							/>
							<View style={ styles.pipe } />
						</Toolbar>
					</FloatingToolbar>
					) }
				<TouchableWithoutFeedback
					onPress={ this.onFocus }
					accessible={ ! isSelected }
					accessibilityRole={ 'button' }
				>
					<View style={ [
						styles.blockHolder,
						borderStyle,
						isSelected && ( isGroupType || isInnerBlock || isNestedInnerBlock ) && styles.outlineBorderMargin,
						isDashed && styles.dashedBorderMargin,
						isGroupType && styles.verticalPaddingNone,
						{ borderColor },
					]
					}>
						{ showTitle && this.renderBlockTitle() }
						<View
							accessibilityLabel={ accessibilityLabel }
							style={ [
								! isSelected && this.applyUnSelectedStyle(),
								isSelected && this.applySelectedStyle(),
								isDimmed && styles.blockContainerDimmed,
								isGroupType && styles.verticalPaddingNone,
							] }
						>
							{ isValid && this.getBlockForType() }
							{ ! isValid &&
							<BlockInvalidWarning blockTitle={ title } icon={ icon } />
							}
						</View>
						{ isSelected && <BlockMobileToolbar clientId={ clientId } /> }
					</View>
				</TouchableWithoutFeedback>
			</>
		);
	}
}

export default compose( [
	withSelect( ( select, { clientId, rootClientId } ) => {
		const {
			getBlockIndex,
			getBlocks,
			isBlockSelected,
			__unstableGetBlockWithoutInnerBlocks,
			getBlockHierarchyRootClientId,
			getSelectedBlockClientId,
			getBlock,
			getBlockRootClientId,
			getSelectedBlock,
			getFirstToSelectBlock,
		} = select( 'core/block-editor' );
		const order = getBlockIndex( clientId, rootClientId );
		const isSelected = isBlockSelected( clientId );
		const isFirstBlock = order === 0;
		const isLastBlock = order === getBlocks().length - 1;
		const block = __unstableGetBlockWithoutInnerBlocks( clientId );
		const { name, attributes, isValid } = block || {};
		const blockType = getBlockType( name || 'core/missing' );
		const title = blockType.title;
		const icon = blockType.icon;
		const getAccessibilityLabelExtra = blockType.__experimentalGetAccessibilityLabel;

		const selectedBlock = getSelectedBlock();
		const parentId = getBlockRootClientId( clientId );
		const parentBlock = getBlock( parentId );

		const isMediaText = selectedBlock && selectedBlock.name === 'core/media-text';
		const isMediaTextParent = parentBlock && parentBlock.name === 'core/media-text';

		const rootBlockId = getBlockHierarchyRootClientId( clientId );
		const rootBlock = getBlock( rootBlockId );
		const hasRootInnerBlocks = rootBlock.innerBlocks.length !== 0;

		const showFloatingToolbar = isSelected && hasRootInnerBlocks && ! isMediaText && ! isMediaTextParent;

		const firstToSelect = getFirstToSelectBlock( clientId );

		const selectedBlockClientId = getSelectedBlockClientId();
		const isRootSiblingsSelected = getBlockRootClientId( selectedBlockClientId ) === '';

		const isDashed = selectedBlockClientId === parentId && ! isMediaTextParent;
		const isDimmed = ! isSelected && ! isRootSiblingsSelected && !! selectedBlockClientId && firstToSelect === clientId && ! isDashed;

		const isInnerBlock = parentId && firstToSelect !== parentId;
		const isChildOfSameRootBlook = rootBlockId === getBlockHierarchyRootClientId( selectedBlockClientId );
		const isNestedInnerBlock = ! isDashed && selectedBlockClientId === getBlockRootClientId( firstToSelect );
		const isGroupType = blockType.name === 'core/group';
		const isParentSelected = parentId === selectedBlockClientId;

		return {
			icon,
			name: name || 'core/missing',
			order,
			title,
			attributes,
			blockType,
			isFirstBlock,
			isLastBlock,
			isSelected,
			isValid,
			getAccessibilityLabelExtra,
			showFloatingToolbar,
			parentId,
			isDashed,
			isDimmed,
			firstToSelect,
			isInnerBlock,
			isChildOfSameRootBlook,
			isNestedInnerBlock,
			isGroupType,
			isParentSelected,
			isMediaText,
		};
	} ),
	withDispatch( ( dispatch, ownProps, { select } ) => {
		const {
			insertBlocks,
			mergeBlocks,
			replaceBlocks,
			selectBlock,
			updateBlockAttributes,
		} = dispatch( 'core/block-editor' );

		return {
			mergeBlocks( forward ) {
				const { clientId } = ownProps;
				const {
					getPreviousBlockClientId,
					getNextBlockClientId,
				} = select( 'core/block-editor' );

				if ( forward ) {
					const nextBlockClientId = getNextBlockClientId( clientId );
					if ( nextBlockClientId ) {
						mergeBlocks( clientId, nextBlockClientId );
					}
				} else {
					const previousBlockClientId = getPreviousBlockClientId( clientId );
					if ( previousBlockClientId ) {
						mergeBlocks( previousBlockClientId, clientId );
					}
				}
			},
			onInsertBlocks( blocks, index ) {
				insertBlocks( blocks, index, ownProps.rootClientId );
			},
			onSelect( clientId = ownProps.clientId, initialPosition ) {
				selectBlock( clientId, initialPosition );
			},
			onChange: ( attributes ) => {
				updateBlockAttributes( ownProps.clientId, attributes );
			},
			onReplace( blocks, indexToSelect ) {
				replaceBlocks( [ ownProps.clientId ], blocks, indexToSelect );
			},
		};
	} ),
] )( BlockListBlock );