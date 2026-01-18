/**
 * Org-mode to HTML converter.
 * Converts Org syntax to styled HTML for pasting into rich text editors.
 */

import { HtmlTarget, getElementStyle, wrapHtmlForTarget } from './html-targets.js';

/**
 * Options for Org to HTML conversion.
 */
export interface OrgToHtmlOptions {
  /** Target application for optimized styling. Defaults to 'html'. */
  target?: HtmlTarget;
}

/**
 * Returns the style for Org-mode tags (badges) based on target.
 */
function getTagStyle(target: HtmlTarget): string {
  switch (target) {
    case 'google-docs':
      return 'background-color:#e8e8e8; color:#555; padding:2px 6px; border-radius:3px; font-size:0.75em; font-weight:normal; margin-left:8px';
    case 'word':
      return 'background-color:#e8e8e8; color:#555; padding:2px 6px; font-size:9pt; mso-highlight:#e8e8e8';
    default:
      return 'background-color:#e8e8e8; color:#555; padding:2px 6px; border-radius:3px; font-size:0.75em; margin-left:8px';
  }
}

/**
 * Parses tags from an Org heading line.
 * Tags are at the end of the line in the format :tag1:tag2:tag3:
 * 
 * @returns Object with headingText (without tags) and tags array
 */
function parseHeadingTags(headingText: string): { text: string; tags: string[] } {
  // Match tags at the end: :tag1:tag2: (must end with colon)
  const tagMatch = headingText.match(/\s+(:[a-zA-Z0-9_@#%]+(?::[a-zA-Z0-9_@#%]+)*:)\s*$/);
  if (tagMatch) {
    const tagString = tagMatch[1];
    // Extract individual tags (split by : and filter empty)
    const tags = tagString.split(':').filter(t => t.length > 0);
    const text = headingText.slice(0, headingText.length - tagMatch[0].length);
    return { text, tags };
  }
  return { text: headingText, tags: [] };
}

/**
 * Renders tags as styled badge spans.
 */
function renderTags(tags: string[], target: HtmlTarget): string {
  if (tags.length === 0) return '';
  
  const style = getTagStyle(target);
  return tags.map(tag => `<span style="${style}">${escapeHtml(tag)}</span>`).join(' ');
}

/**
 * Returns the style for Org-mode timestamps based on target.
 * Timestamps are styled as subtle, muted text to indicate metadata.
 */
function getTimestampStyle(target: HtmlTarget): string {
  switch (target) {
    case 'google-docs':
      return 'color:#666; font-size:10pt; font-style:italic';
    case 'word':
      return 'color:#666; font-size:10pt; font-style:italic; mso-bidi-font-style:italic';
    default:
      return 'color:#666; font-size:0.9em; font-style:italic';
  }
}

/**
 * Renders an Org timestamp as a styled element.
 * Standalone timestamps (on their own line) are rendered as a separate block.
 */
function renderTimestamp(timestamp: string, target: HtmlTarget): string {
  const style = getTimestampStyle(target);
  return `<p style="${style}">${escapeHtml(timestamp)}</p>`;
}

/**
 * Strips property drawers from Org content.
 * Property drawers are :PROPERTIES: ... :END: blocks.
 */
function stripPropertyDrawers(org: string): string {
  // Remove :PROPERTIES: ... :END: blocks (can span multiple lines)
  return org.replace(/^[ \t]*:PROPERTIES:[\s\S]*?^[ \t]*:END:[ \t]*\n?/gm, '');
}

/**
 * Converts Org-mode text to HTML with target-specific styling.
 * 
 * @param org - The Org-mode string to convert
 * @param options - Conversion options including target application
 * @returns HTML string optimized for the target application
 */
export function convertOrgToHtml(org: string, options: OrgToHtmlOptions = {}): string {
  if (!org || typeof org !== 'string') {
    return '';
  }

  const { target = 'html' } = options;
  
  // Strip property drawers before processing
  const cleanedOrg = stripPropertyDrawers(org);
  
  const lines = cleanedOrg.split('\n');
  const htmlLines: string[] = [];
  
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockContent: string[] = [];
  let inList = false;
  let listOrdered = false;
  let listItems: string[] = [];
  let paragraphLines: string[] = [];
  
  /**
   * Flushes accumulated paragraph lines as a single <p> element.
   */
  function flushParagraph() {
    if (paragraphLines.length > 0) {
      const pStyle = getElementStyle('p', target);
      const pStyleAttr = pStyle ? ` style="${pStyle}"` : '';
      const content = paragraphLines.map(l => convertInlineFormatting(l, target)).join(' ');
      htmlLines.push(`<p${pStyleAttr}>${content}</p>`);
      paragraphLines = [];
    }
  }
  
  /**
   * Flushes the current list if one is active.
   */
  function flushList() {
    if (inList) {
      htmlLines.push(renderList(listItems, target, listOrdered));
      listItems = [];
      inList = false;
      listOrdered = false;
    }
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Code block handling
    if (/^#\+BEGIN_SRC\s*(\w*)/i.test(line)) {
      flushParagraph();
      flushList();
      const match = line.match(/^#\+BEGIN_SRC\s*(\w*)/i);
      codeBlockLang = match?.[1] || '';
      inCodeBlock = true;
      codeBlockContent = [];
      continue;
    }
    
    if (/^#\+END_SRC/i.test(line)) {
      // Word doesn't handle <pre> well - use <p> with <br> and monospace styling
      if (target === 'word') {
        const codeStyle = "font-family:'Consolas','Courier New',monospace;font-size:11pt;line-height:1.5;margin:12pt 0;";
        const escapedLines = codeBlockContent.map(escapeHtml);
        htmlLines.push(`<p style="${codeStyle}">${escapedLines.join('<br>')}</p>`);
      } else {
        const preStyle = getElementStyle('pre', target);
        const codeStyle = getElementStyle('code', target);
        const preStyleAttr = preStyle ? ` style="${preStyle}"` : '';
        const codeStyleAttr = codeStyle ? ` style="${codeStyle}"` : '';
        const escapedCode = codeBlockContent.map(escapeHtml).join('\n');
        htmlLines.push(`<pre${preStyleAttr}><code${codeStyleAttr}>${escapedCode}</code></pre>`);
      }
      inCodeBlock = false;
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }
    
    // Quote blocks
    if (/^#\+BEGIN_QUOTE/i.test(line)) {
      flushParagraph();
      continue; // Start of quote block
    }
    if (/^#\+END_QUOTE/i.test(line)) {
      continue; // End of quote block
    }
    
    // Headings: * Heading, ** Heading, etc. (may have :tags: at end)
    const headingMatch = line.match(/^(\*+)\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(headingMatch[1].length, 6);
      
      // Parse tags from heading
      const { text: headingText, tags } = parseHeadingTags(headingMatch[2]);
      const formattedText = convertInlineFormatting(headingText, target);
      const tagHtml = renderTags(tags, target);
      
      const style = getElementStyle(`h${level}` as 'h1', target);
      const styleAttr = style ? ` style="${style}"` : '';
      
      // Combine heading text and tags
      const content = tagHtml ? `${formattedText} ${tagHtml}` : formattedText;
      htmlLines.push(`<h${level}${styleAttr}>${content}</h${level}>`);
      continue;
    }
    
    // Standalone timestamp lines: [2026-01-14 Wed 11:49] or <2026-01-14 Wed>
    const timestampLineMatch = line.match(/^\s*([\[<]\d{4}-\d{2}-\d{2}( [A-Za-z]{2,3})?( \d{1,2}:\d{2})?[\]>])\s*$/);
    if (timestampLineMatch) {
      flushParagraph();
      flushList();
      htmlLines.push(renderTimestamp(timestampLineMatch[1], target));
      continue;
    }
    
    // Unordered list items: - item or + item
    const ulMatch = line.match(/^(\s*)[-+]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      if (!inList) {
        inList = true;
        listOrdered = false;
        listItems = [];
      }
      listItems.push(convertInlineFormatting(ulMatch[2], target));
      continue;
    }
    
    // Ordered list items: 1. item or 1) item
    const olMatch = line.match(/^(\s*)\d+[.)]\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (!inList) {
        inList = true;
        listOrdered = true;
        listItems = [];
      }
      listItems.push(convertInlineFormatting(olMatch[2], target));
      continue;
    }
    
    // Close list if we hit a non-list line
    if (inList && line.trim() !== '') {
      flushList();
    }
    
    // Table rows
    if (line.match(/^\|.*\|$/)) {
      flushParagraph();
      // Skip separator rows (|---+---| or |---|---|)
      if (line.match(/^\|[-+]+\|$/)) {
        continue;
      }
      const cells = line.slice(1, -1).split('|').map(cell => 
        convertInlineFormatting(cell.trim(), target)
      );
      const tdStyle = getElementStyle('td', target);
      const styleAttr = tdStyle ? ` style="${tdStyle}"` : '';
      const row = cells.map(cell => `<td${styleAttr}>${cell}</td>`).join('');
      htmlLines.push(`<tr>${row}</tr>`);
      continue;
    }
    
    // Empty lines - flush paragraph
    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }
    
    // Regular text - accumulate for paragraph
    paragraphLines.push(line);
  }
  
  // Flush any remaining paragraph
  flushParagraph();
  
  // Close any open list
  flushList();
  
  // Wrap tables
  const bodyHtml = wrapTables(htmlLines.join('\n'), target);
  
  return wrapHtmlForTarget(bodyHtml, target);
}

/**
 * Converts Org inline formatting to HTML.
 * Uses a placeholder system to prevent formatting patterns from interfering with each other.
 */
function convertInlineFormatting(text: string, target: HtmlTarget): string {
  // Store all formatted elements to protect them from subsequent processing
  const placeholders: string[] = [];
  
  function addPlaceholder(html: string): string {
    placeholders.push(html);
    return `ORGFMT${placeholders.length - 1}ENDFMT`;
  }
  
  let result = text;
  
  // Extract links first (before escaping)
  // Links with description: [[url][text]]
  result = result.replace(/\[\[([^\]]+)\]\[([^\]]+)\]\]/g, (_, url, linkText) => {
    const style = getElementStyle('a', target);
    const styleAttr = style ? ` style="${style}"` : '';
    return addPlaceholder(`<a href="${escapeHtml(url)}"${styleAttr}>${escapeHtml(linkText)}</a>`);
  });
  
  // Links without description: [[url]]
  result = result.replace(/\[\[([^\]]+)\]\]/g, (_, url) => {
    const style = getElementStyle('a', target);
    const styleAttr = style ? ` style="${style}"` : '';
    return addPlaceholder(`<a href="${escapeHtml(url)}"${styleAttr}>${escapeHtml(url)}</a>`);
  });
  
  // Inline code first (before escaping, so we can escape the code content properly)
  // ~code~ or =code=
  result = result.replace(/~([^~\n]+)~/g, (_, code) => {
    const style = getElementStyle('code', target);
    const styleAttr = style ? ` style="${style}"` : '';
    return addPlaceholder(`<code${styleAttr}>${escapeHtml(code)}</code>`);
  });
  result = result.replace(/=([^=\n]+)=/g, (_, code) => {
    const style = getElementStyle('code', target);
    const styleAttr = style ? ` style="${style}"` : '';
    return addPlaceholder(`<code${styleAttr}>${escapeHtml(code)}</code>`);
  });
  
  // Now escape the rest (placeholders are safe alphanumeric)
  result = escapeHtml(result);
  
  // Bold: *text* - use placeholders to prevent interference
  result = result.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, (_, content) => {
    return addPlaceholder(`<strong>${content}</strong>`);
  });
  
  // Italic: /text/
  result = result.replace(/\/([^/\n]+)\//g, (_, content) => {
    return addPlaceholder(`<em>${content}</em>`);
  });
  
  // Strikethrough: +text+
  result = result.replace(/\+([^+\n]+)\+/g, (_, content) => {
    return addPlaceholder(`<del>${content}</del>`);
  });
  
  // Underline: _text_
  result = result.replace(/_([^_\n]+)_/g, (_, content) => {
    return addPlaceholder(`<u>${content}</u>`);
  });
  
  // Restore all placeholders
  for (let i = 0; i < placeholders.length; i++) {
    result = result.replace(`ORGFMT${i}ENDFMT`, placeholders[i]);
  }
  
  return result;
}


/**
 * Renders a list of items as HTML.
 * @param items - Array of list item content (already converted to HTML)
 * @param target - Target application for styling
 * @param ordered - Whether this is an ordered (numbered) list
 */
function renderList(items: string[], target: HtmlTarget, ordered: boolean = false): string {
  const tag = ordered ? 'ol' : 'ul';
  const listStyle = getElementStyle(tag as 'ul', target);
  const liStyle = getElementStyle('li', target);
  const listStyleAttr = listStyle ? ` style="${listStyle}"` : '';
  const liStyleAttr = liStyle ? ` style="${liStyle}"` : '';
  
  const listHtml = items
    .map(item => `<li${liStyleAttr}>${item}</li>`)
    .join('\n');
  
  return `<${tag}${listStyleAttr}>\n${listHtml}\n</${tag}>`;
}

/**
 * Wraps table rows in a table element.
 */
function wrapTables(html: string, target: HtmlTarget): string {
  const tableStyle = getElementStyle('table', target);
  const tableStyleAttr = tableStyle ? ` style="${tableStyle}"` : '';
  
  // Find consecutive tr elements and wrap them
  return html.replace(/(<tr>.*?<\/tr>\n?)+/gs, (match) => {
    return `<table${tableStyleAttr}>\n${match}</table>\n`;
  });
}

/**
 * Escapes HTML special characters.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
