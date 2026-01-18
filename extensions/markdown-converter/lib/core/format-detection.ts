/**
 * Input format detection for clipboard content.
 * Auto-detects Markdown, Org-mode, or plain text without user intervention.
 * 
 * Uses a scoring approach to handle ambiguous patterns (e.g., `* item` could
 * be Markdown list or Org heading). Defaults to Markdown when scores are tied.
 */

/**
 * Detected input format type.
 * - 'markdown': Content contains Markdown syntax
 * - 'org': Content contains Org-mode syntax
 * - 'plain': Plain text with no detected markup
 */
export type DetectedFormat = 'markdown' | 'org' | 'plain';

/**
 * Counts pattern matches in text, returning the number of unique matches.
 */
function countMatches(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * Detects the input format of text content using a scoring system.
 * 
 * Each format has distinctive patterns worth different points:
 * - High-confidence patterns (unique to one format): 10 points each
 * - Medium-confidence patterns: 3 points each  
 * - Low-confidence/ambiguous patterns: 1 point each
 * 
 * Markdown wins ties (more common format).
 * 
 * @param text - The text content to analyze
 * @returns The detected format type
 */
export function detectInputFormat(text: string): DetectedFormat {
  if (!text || typeof text !== 'string') {
    return 'plain';
  }

  let markdownScore = 0;
  let orgScore = 0;

  // === HIGH-CONFIDENCE MARKDOWN PATTERNS (10 points each) ===
  // These are unique to Markdown and don't appear in Org
  
  // ATX headings: # Heading (Org uses * Heading)
  if (/^#{1,6} /m.test(text)) markdownScore += 10;
  
  // Markdown links: [text](url) - Org uses [[url][text]]
  if (/\[[^\]]+\]\([^)]+\)/.test(text)) markdownScore += 10;
  
  // Fenced code blocks: ``` or ~~~ (Org uses #+BEGIN_SRC)
  if (/^```/m.test(text) || /^~~~/m.test(text)) markdownScore += 10;
  
  // Task lists with checkboxes: - [x] or * [x] (GFM extension)
  if (/^[-*+] +\[[ xX]\]/m.test(text)) markdownScore += 10;

  // === HIGH-CONFIDENCE ORG PATTERNS (10 points each) ===
  // These are unique to Org and don't appear in Markdown
  
  // Org links: [[url]] or [[url][text]] - match [[ followed by ]] anywhere
  if (/\[\[.+?\]\]/.test(text)) orgScore += 10;
  
  // Org blocks: #+BEGIN_SRC, #+BEGIN_QUOTE, etc.
  if (/#\+BEGIN_/i.test(text) || /#\+END_/i.test(text)) orgScore += 10;
  
  // Org table separators with + signs: |---+---| (Markdown uses |---|)
  if (/^\|[-+]+\|$/m.test(text) && text.includes('+')) orgScore += 10;
  
  // Org inline code: =code= or ~code~ (different from Markdown's `code`)
  if (/(?<!=)=[^\s=][^=]*[^\s=]=(?!=)/.test(text)) orgScore += 5;
  if (/(?<!~)~[^\s~][^~]*[^\s~]~(?!~)/.test(text)) orgScore += 5;
  
  // Multi-level Org headings: ** or *** (rare in Markdown context)
  if (/^\*{2,} [^\n]+$/m.test(text)) orgScore += 10;

  // === MEDIUM-CONFIDENCE MARKDOWN PATTERNS (3 points each) ===
  
  // Bold: **text** (Org uses *text*)
  if (/\*\*[^*]+\*\*/.test(text)) markdownScore += 3;
  
  // GFM strikethrough: ~~text~~ (double tildes, not single like Org's ~code~)
  if (/~~[^~]+~~/.test(text)) markdownScore += 3;
  
  // Underscore formatting: __bold__ or _italic_
  if (/__[^_]+__/.test(text) || /_[^_]+_/.test(text)) markdownScore += 3;
  
  // Blockquotes: > text (not used in Org)
  if (/^> /m.test(text)) markdownScore += 3;
  
  // Inline code with backticks: `code`
  if (/`[^`]+`/.test(text)) markdownScore += 3;
  
  // Ordered lists: 1. item
  if (/^\d+\. /m.test(text)) markdownScore += 3;
  
  // Unordered lists with -, *, or + (ambiguous with Org * but common in MD)
  if (/^[-*+] [^\[]/m.test(text)) markdownScore += 2;
  
  // Single asterisk italic: *text* (Org uses /text/)
  // Low confidence since could be interpreted as Org bold
  if (/(?<!\*)\*[^*\s][^*]*[^*\s]\*(?!\*)/.test(text)) markdownScore += 1;

  // === MEDIUM-CONFIDENCE ORG PATTERNS (3 points each) ===
  
  // TODO/DONE keywords after heading stars
  if (/^\*+ (TODO|DONE|NEXT|WAITING|CANCELLED) /m.test(text)) orgScore += 3;
  
  // Property drawers
  if (/:PROPERTIES:/i.test(text)) orgScore += 3;
  
  // Org tags at end of line: :tag: or :tag1:tag2: (distinctive Org pattern)
  if (/:[a-zA-Z0-9_@#%]+(?::[a-zA-Z0-9_@#%]+)*:\s*$/m.test(text)) orgScore += 5;
  
  // Org timestamps: [2026-01-14 Wed] or <2026-01-14 Wed>
  if (/[\[<]\d{4}-\d{2}-\d{2}( [A-Za-z]{2,3})?( \d{1,2}:\d{2})?[\]>]/.test(text)) orgScore += 3;

  // === LOW-CONFIDENCE / AMBIGUOUS PATTERNS (1 point each) ===
  // These appear in both formats but lean one way
  
  // Tables with pipes (both use them, but give slight edge to Markdown)
  if (/^\|.+\|$/m.test(text)) markdownScore += 1;
  
  // Single * at line start: could be Markdown list OR Org heading
  // Don't award points - let other signals decide

  // Decide based on scores
  if (markdownScore === 0 && orgScore === 0) {
    return 'plain';
  }
  
  // Markdown wins ties (more common format)
  if (markdownScore >= orgScore) {
    return 'markdown';
  }
  
  return 'org';
}

/**
 * Returns a human-readable label for the detected format.
 * Used for UI display (e.g., "Markdown detected").
 * 
 * @param format - The detected format
 * @returns Human-readable format label
 */
export function getFormatLabel(format: DetectedFormat): string {
  switch (format) {
    case 'markdown':
      return 'Markdown';
    case 'org':
      return 'Org-mode';
    case 'plain':
      return 'Plain text';
  }
}
