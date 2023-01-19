//
//  markdown.ts
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { DesignSystemVersion, DocumentationPage, MarkdownTransform, MarkdownTransformType } from "@supernovaio/supernova-sdk"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Markdown helpers

/** Converts entire definition of the page, including its metadata like title and description, to commonmark representation */
export const parsePageToCommonMark = async (page: DocumentationPage, version: DesignSystemVersion): Promise<string> => {
  const markdownExporter = new MarkdownTransform(MarkdownTransformType.commonmark, version)
  return await markdownExporter.convertPageToMarkdown(page)
}
