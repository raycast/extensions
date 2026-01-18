/**
 * Target-specific HTML styling for rich text output.
 * Different applications (Google Docs, Word, etc.) interpret pasted HTML differently.
 * This module provides optimized HTML generation for each target.
 */

/**
 * Target application for HTML output.
 * - 'html': Generic semantic HTML
 * - 'google-docs': Optimized for Google Docs paste
 * - 'word': Optimized for Microsoft Word paste
 */
export type HtmlTarget = 'html' | 'google-docs' | 'word';

/**
 * Returns a human-readable label for the target.
 * Used for UI display in dropdowns.
 * 
 * @param target - The HTML target
 * @returns Human-readable target label
 */
export function getTargetLabel(target: HtmlTarget): string {
  switch (target) {
    case 'html':
      return 'HTML (Generic)';
    case 'google-docs':
      return 'Google Docs';
    case 'word':
      return 'Microsoft Word';
  }
}

/**
 * All available HTML targets for UI rendering.
 */
export const HTML_TARGETS: readonly HtmlTarget[] = ['html', 'google-docs', 'word'] as const;

/**
 * Default styles for Google Docs compatibility.
 * Google Docs ignores CSS classes but respects inline styles.
 */
const GOOGLE_DOCS_STYLES = {
  // Heading styles matching Google Docs defaults
  h1: 'font-size:20pt;font-weight:400;color:#000000;',
  h2: 'font-size:16pt;font-weight:400;color:#000000;',
  h3: 'font-size:14pt;font-weight:400;color:#434343;',
  h4: 'font-size:12pt;font-weight:400;color:#666666;',
  h5: 'font-size:11pt;font-weight:400;color:#666666;',
  h6: 'font-size:11pt;font-weight:400;font-style:italic;color:#666666;',
  // Body text
  p: 'font-size:11pt;line-height:1.15;color:#000000;',
  // Code - use single quotes for font-family to avoid breaking style attribute
  code: "font-family:'Courier New',monospace;font-size:10pt;background-color:#f8f9fa;padding:1px 4px;",
  pre: "font-family:'Courier New',monospace;font-size:10pt;background-color:#f8f9fa;padding:8px;white-space:pre-wrap;",
  // Links
  a: 'color:#1155cc;text-decoration:underline;',
  // Lists
  ul: 'margin-left:0;padding-left:24pt;',
  ol: 'margin-left:0;padding-left:24pt;',
  li: 'font-size:11pt;line-height:1.15;',
  // Tables
  table: 'border-collapse:collapse;',
  th: 'border:1px solid #000000;padding:5pt;',
  td: 'border:1px solid #000000;padding:5pt;',
  // Block elements
  blockquote: 'border-left:4px solid #d0d0d0;margin-left:0;padding-left:16px;color:#666666;font-style:italic;',
} as const;

/**
 * Default styles for Microsoft Word compatibility.
 * Word recognizes special mso-* CSS properties.
 */
const WORD_STYLES = {
  // Heading styles with MSO style names
  h1: "mso-style-name:'Heading 1';font-size:24pt;font-weight:bold;font-family:'Calibri Light',sans-serif;color:#2F5496;",
  h2: "mso-style-name:'Heading 2';font-size:18pt;font-weight:bold;font-family:'Calibri Light',sans-serif;color:#2F5496;",
  h3: "mso-style-name:'Heading 3';font-size:14pt;font-weight:bold;font-family:'Calibri Light',sans-serif;color:#1F3763;",
  h4: "mso-style-name:'Heading 4';font-size:12pt;font-weight:bold;font-style:italic;font-family:'Calibri Light',sans-serif;color:#2F5496;",
  h5: "mso-style-name:'Heading 5';font-size:11pt;font-family:'Calibri Light',sans-serif;color:#2F5496;",
  h6: "mso-style-name:'Heading 6';font-size:11pt;font-style:italic;font-family:'Calibri Light',sans-serif;color:#1F3763;",
  // Body text
  p: "mso-style-name:'Normal';font-size:11pt;font-family:'Calibri',sans-serif;",
  // Code
  code: "font-family:'Consolas','Courier New',monospace;font-size:11pt;",
  pre: "font-family:'Consolas','Courier New',monospace;font-size:11pt;white-space:pre-wrap;mso-style-name:'HTML Preformatted';margin-top:12pt;margin-bottom:12pt;",
  // Links
  a: 'color:#0563C1;text-decoration:underline;',
  // Lists
  ul: "mso-list:l0 level1 lfo1;margin-left:36pt;margin-bottom:10pt;",
  ol: "mso-list:l1 level1 lfo2;margin-left:36pt;margin-bottom:10pt;",
  li: "font-size:11pt;font-family:'Calibri',sans-serif;",
  // Tables
  table: 'border-collapse:collapse;mso-table-layout-alt:fixed;',
  th: 'border:1pt solid #000000;padding:5pt;font-weight:bold;background-color:#D9E2F3;',
  td: 'border:1pt solid #000000;padding:5pt;',
  // Block elements
  blockquote: 'border-left:4pt solid #5B9BD5;margin-left:0;padding-left:12pt;color:#595959;font-style:italic;',
} as const;

type StyleMap = typeof GOOGLE_DOCS_STYLES;
type ElementName = keyof StyleMap;

/**
 * Gets the inline style for an element based on target application.
 * 
 * @param element - The HTML element name (e.g., 'h1', 'p', 'code')
 * @param target - The target application
 * @returns The inline style string, or empty string for generic HTML
 */
export function getElementStyle(element: ElementName, target: HtmlTarget): string {
  switch (target) {
    case 'google-docs':
      return GOOGLE_DOCS_STYLES[element] || '';
    case 'word':
      return WORD_STYLES[element] || '';
    case 'html':
    default:
      return '';
  }
}

/**
 * Wraps HTML content with target-specific document structure.
 * For Word, adds xmlns declarations and meta tags.
 * 
 * @param bodyHtml - The HTML body content
 * @param target - The target application
 * @returns Complete HTML document or fragment
 */
export function wrapHtmlForTarget(bodyHtml: string, target: HtmlTarget): string {
  switch (target) {
    case 'word':
      // Word requires specific xmlns declarations for proper paste
      return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="utf-8">
<meta name="Generator" content="mdconv">
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Normal</w:View></w:WordDocument></xml><![endif]-->
</head>
<body>
${bodyHtml}
</body>
</html>`;
    
    case 'google-docs':
      // Google Docs works with simple HTML fragments
      return `<meta charset="utf-8">${bodyHtml}`;
    
    case 'html':
    default:
      // Generic HTML - simple fragment
      return bodyHtml;
  }
}
