/**
 * Keeps Markdown formatting while preventing remote image embeds from loading
 * sensitive URL parameters merely because a prompt is previewed.
 */
export function localOnlyMarkdownPreview(content: string): string {
  return content.replace(/!\[/gu, String.raw`\![`).replace(/<\s*img\b/giu, "&lt;img");
}
