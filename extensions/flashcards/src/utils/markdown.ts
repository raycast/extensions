/**
 * Convert Markdown intended for a card front into readable list text.
 *
 * List item titles are plain text, so leaving Markdown markers in them makes
 * questions such as "**What does hola mean?**" look unfinished.
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}(?:[-+*]|\d+\.)\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
