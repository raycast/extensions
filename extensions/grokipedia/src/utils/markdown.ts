/**
 * Utilities for sanitising Markdown/HTML snippets for display in lists.
 */
export function sanitizeMarkdown(input?: string) {
  if (!input) return "";
  let s = input;
  s = s.replace(/!\[([^\]]*)\]\((?:[^)]+)\)/g, "$1");
  s = s.replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, "$1");
  s = s.replace(/(\*\*|\*|__|_)(.*?)\1/g, "$2");
  s = s.replace(/`([^`]+)`/g, "$1");
  // Convert <br> tags to newlines before stripping HTML
  s = s.replace(/<br\s*\/?>/gi, "\n");
  // Strip any HTML tags
  s = s.replace(/<[^>]*>/g, "");
  // Decode common HTML entities
  s = s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // Remove any remaining stray asterisks or underscores (unpaired markers)
  s = s.replace(/[*_]+/g, "");
  // Trim leading/trailing punctuation that tends to look noisy (preserve internal punctuation like apostrophes)
  s = s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Process markdown content for rendering, converting HTML elements to markdown equivalents.
 * Converts <br> tags to inline separators that work in markdown tables.
 * Removes images due to broken relative URLs in the API.
 */
export function processMarkdownContent(input?: string) {
  if (!input) return "";
  let s = input;

  // Replace <br> tags with a simple space to keep content inline
  s = s.replace(/<br\s*\/?>/gi, " ");

  // Remove markdown images (they have broken relative URLs)
  s = s.replace(/!\[([^\]]*)\]\([^)]+\)/g, "");

  return s;
}

export default sanitizeMarkdown;
