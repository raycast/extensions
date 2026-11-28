/**
 * Text for one cell of a Markdown table. Backslashes are escaped first, then
 * the characters that would end the cell or start a link, an image, HTML or
 * emphasis, so a label shows as written. Line breaks become spaces, since a
 * table row is one line.
 */
export function markdownCell(text: string): string {
  return text.replace(/[\\`*_[\]<>|!~]/g, "\\$&").replace(/\s+/g, " ");
}
