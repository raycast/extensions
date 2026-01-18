/**
 * Markdown to Org-mode converter.
 * Uses remark to parse Markdown into AST, then serializes to Org syntax.
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toOrg } from './org-stringify.js';

/**
 * Converts Markdown text to Org-mode format.
 * @param markdown - The Markdown string to convert
 * @returns Org-mode formatted text
 */
export function convertMarkdownToOrg(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(markdown);

  return toOrg(tree);
}
