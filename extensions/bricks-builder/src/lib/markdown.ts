/**
 * Escapes text from a site's visitors (form submissions) or from WordPress before it goes into a
 * Raycast Markdown view, so it shows as typed: a submitted ![x](https://…) stays text instead of
 * loading a remote image.
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!|<>~]/g, "\\$&");
}
