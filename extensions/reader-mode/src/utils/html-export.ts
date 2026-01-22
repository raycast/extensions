import { marked } from "marked";

/**
 * Converts Markdown to semantic HTML using marked.
 * No styling is applied — just clean semantic HTML.
 */
export function markdownToHtml(markdown: string): string {
  // Configure marked for GFM (GitHub Flavored Markdown)
  marked.setOptions({
    gfm: true,
    breaks: false,
  });

  const html = marked.parse(markdown);
  return typeof html === "string" ? html : "";
}
