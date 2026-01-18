/**
 * Markdown to HTML converter using the unified ecosystem.
 * Converts Markdown (or plain text) to styled HTML for pasting into
 * Google Docs, Microsoft Word, or other rich text editors.
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import type { Root as HastRoot, Element, Text, ElementContent } from 'hast';
import { HtmlTarget, getElementStyle, wrapHtmlForTarget } from './html-targets.js';

/**
 * Options for Markdown to HTML conversion.
 */
export interface MdToHtmlOptions {
  /** Target application for optimized styling. Defaults to 'html'. */
  target?: HtmlTarget;
}

/**
 * Strips YAML front matter from Markdown content.
 * Front matter must start at the very beginning of the document with ---
 * and end with --- or ...
 * 
 * @param markdown - The Markdown string potentially containing front matter
 * @returns The Markdown content with front matter removed
 */
export function stripYamlFrontMatter(markdown: string): string {
  // Front matter must start at the beginning of the document
  if (!markdown.startsWith('---')) {
    return markdown;
  }
  
  // Find the closing delimiter (--- or ...)
  // Must be on its own line after the opening ---
  const closingMatch = markdown.match(/^---\r?\n[\s\S]*?\r?\n(---|\.\.\.)\r?\n/);
  if (closingMatch) {
    return markdown.slice(closingMatch[0].length);
  }
  
  return markdown;
}

/**
 * Converts Markdown text to HTML with target-specific styling.
 * 
 * Pipeline: Markdown → remark-parse → mdast → remark-rehype → hast → rehype-stringify → HTML
 * 
 * @param markdown - The Markdown string to convert
 * @param options - Conversion options including target application
 * @returns HTML string optimized for the target application
 */
export function convertMarkdownToHtml(markdown: string, options: MdToHtmlOptions = {}): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  const { target = 'html' } = options;
  
  // Strip YAML front matter before processing
  const cleanedMarkdown = stripYamlFrontMatter(markdown);

  // Build the processor
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(addTargetStyles, { target })
    .use(rehypeStringify, { allowDangerousHtml: false });

  // Process synchronously
  const result = processor.processSync(cleanedMarkdown);
  const bodyHtml = String(result);

  // Wrap with target-specific document structure
  return wrapHtmlForTarget(bodyHtml, target);
}

/**
 * Converts plain text to HTML paragraphs.
 * 
 * Delegates to Markdown conversion since Markdown is a superset of plain text.
 * This provides proper paragraph handling:
 * - Single newlines are joined (become spaces)
 * - Double newlines create paragraph breaks
 * - Any accidental Markdown syntax is handled gracefully
 * 
 * @param text - Plain text to convert
 * @param options - Conversion options including target application
 * @returns HTML string with paragraph structure
 */
export function convertPlainTextToHtml(text: string, options: MdToHtmlOptions = {}): string {
  // Treat plain text as Markdown - it's a superset, so this just works
  return convertMarkdownToHtml(text, options);
}

/**
 * Rehype plugin to add target-specific inline styles to elements.
 */
function addTargetStyles(options: { target: HtmlTarget }) {
  const { target } = options;

  return (tree: HastRoot) => {
    // Track list depth for Word's mso-list levels
    visitNodesWithDepth(tree, 0, (node, listDepth) => {
      if (node.type === 'element') {
        addStyleToElement(node, target, listDepth);
        
        // For Google Docs, wrap table cell content in p>span with explicit font-weight
        if (target === 'google-docs' && (node.tagName === 'td' || node.tagName === 'th')) {
          wrapCellContentForGoogleDocs(node);
        }
      }
    });
  };
}

/**
 * Elements that should receive target-specific styling.
 */
const STYLED_ELEMENTS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'a', 'code', 'pre',
  'ul', 'ol', 'li',
  'table', 'th', 'td',
  'blockquote'
]);

/**
 * Adds inline style to an element based on target.
 */
function addStyleToElement(element: Element, target: HtmlTarget, listDepth: number): void {
  const tagName = element.tagName.toLowerCase();
  
  if (!STYLED_ELEMENTS.has(tagName)) {
    return;
  }

  // Type assertion is safe because we've already checked the tag is in STYLED_ELEMENTS
  type StyledElementName = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'a' | 'code' | 'pre' | 'ul' | 'ol' | 'li' | 'table' | 'th' | 'td' | 'blockquote';
  let style = getElementStyle(tagName as StyledElementName, target);
  
  // For Word, adjust list styles based on nesting depth
  if (target === 'word' && (tagName === 'ul' || tagName === 'ol' || tagName === 'li')) {
    style = getWordListStyle(tagName, listDepth);
  }
  
  if (style) {
    element.properties = element.properties || {};
    const existingStyle = element.properties.style as string || '';
    element.properties.style = existingStyle ? `${existingStyle};${style}` : style;
  }
}

/**
 * Gets Word-specific list style with proper nesting level.
 */
function getWordListStyle(tagName: string, listDepth: number): string {
  const level = Math.max(1, listDepth);
  const indent = level * 36; // 36pt per level (0.5 inch)
  
  switch (tagName) {
    case 'ul':
      return `mso-list:l0 level${level} lfo1;margin-left:${indent}pt;`;
    case 'ol':
      return `mso-list:l1 level${level} lfo2;margin-left:${indent}pt;`;
    case 'li':
      return `font-size:11pt;font-family:'Calibri',sans-serif;mso-list:l0 level${level} lfo1;`;
    default:
      return '';
  }
}

/**
 * Recursively visits all nodes in a hast tree, tracking list depth.
 * List containers (ul/ol) get an incremented depth, as do their children.
 */
function visitNodesWithDepth(
  node: HastRoot | ElementContent, 
  listDepth: number, 
  visitor: (node: ElementContent, listDepth: number) => void
): void {
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      // Calculate depth: increment when this node IS a list container
      let childDepth = listDepth;
      if (child.type === 'element' && (child.tagName === 'ul' || child.tagName === 'ol')) {
        childDepth = listDepth + 1;
      }
      
      // Visit this node with its appropriate depth
      visitor(child as ElementContent, childDepth);
      
      // Recurse with the same depth (children of lists inherit list depth)
      visitNodesWithDepth(child as HastRoot | ElementContent, childDepth, visitor);
    }
  }
}

/**
 * Wraps table cell content in span for Google Docs compatibility.
 * Google Docs needs explicit font-weight to prevent bold inheritance.
 */
function wrapCellContentForGoogleDocs(cell: Element): void {
  const isHeader = cell.tagName === 'th';
  const fontWeight = isHeader ? 'bold' : 'normal';
  
  // Create a span with explicit font-weight
  const span: Element = {
    type: 'element',
    tagName: 'span',
    properties: { style: `font-weight:${fontWeight};` },
    children: cell.children as ElementContent[]
  };
  
  // Replace cell children with the span
  cell.children = [span];
}
