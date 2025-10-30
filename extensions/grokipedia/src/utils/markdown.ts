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

export default sanitizeMarkdown;
