//
//  transform.ts
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { DocumentationPage, DocumentationPageBlock, DocumentationPageBlockText } from "@supernovaio/supernova-sdk"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Transformation helpers

/** Creates flattened structure of the blocks, even from the contained blocks, so it is easier to iterate through them */
export function flattenedBlocksOfPage(page: DocumentationPage): Array<DocumentationPageBlock> {
  let blocks: Array<DocumentationPageBlock> = page.blocks
  for (const block of page.blocks) {
    blocks = blocks.concat(flattenedBlocksOfBlock(block))
  }

  return blocks
}

/** Flattens one leaf of blocks */
export function flattenedBlocksOfBlock(block: DocumentationPageBlock): Array<DocumentationPageBlock> {
  let subblocks: Array<DocumentationPageBlock> = block.children
  for (const subblock of block.children) {
    subblocks = subblocks.concat(flattenedBlocksOfBlock(subblock))
  }

  return subblocks
}

/** Flatten text of rich text block to a continuous string */
export function textOfBlock(block: DocumentationPageBlockText): {
  text: string
  blockId: string
} {
  return {
    text: block.text.spans.map((s) => s.text).join(""),
    blockId: block.id
  }
}
