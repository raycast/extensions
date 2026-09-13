import { marked } from "marked";

/**
 * Convert markdown into clean, editor-safe HTML for the rich-text clipboard
 * flavor — preserving bold, italics, and links, with exactly one blank line
 * between paragraphs across editors that keep <p> margins (Docs/Gmail) and ones
 * that strip them (HubSpot). Identical spacing strategy to Magic Formatter.
 */
export function markdownToHtml(markdown: string): string {
  marked.setOptions({
    gfm: true,
    breaks: true, // single newline -> <br>, so soft line breaks survive
  });

  const tokens = marked.lexer(markdown);
  const blocks: string[] = [];
  for (const token of tokens) {
    if (token.type === "space") continue;
    let html = (marked.parser([token]) as string).trim();
    if (!html) continue;
    // margin:0 makes every block render tight, so the single <br> below is the
    // ONE source of spacing in every editor (Docs/Gmail keep margins, HubSpot
    // strips them — this neutralizes the difference).
    html = html.replace(/^<(p|ul|ol|h[1-6]|blockquote|pre|table)(\s[^>]*)?>/i, (_m, tag, attrs) => {
      return `<${tag}${attrs ?? ""} style="margin:0;">`;
    });
    blocks.push(html);
  }

  const body = blocks.join("\n<br>\n");

  // Charset hint prevents Latin-1 mojibake (â€" / â€™) when apps read public.html.
  return `<meta charset="utf-8">\n` + body;
}
