import { marked } from "marked";

/**
 * Convert markdown into clean, email-safe HTML suitable for the rich-text
 * clipboard flavor. The goal is that pasting into Gmail / Docs / Word / Outlook
 * produces real bold, real italics, and real bullet/numbered lists — while the
 * plain-text flavor (the markdown itself) still pastes cleanly into Slack /
 * Notion / ChatGPT.
 *
 * We keep the HTML deliberately simple: no <html>/<head> wrapper, inline-friendly
 * block elements, and a blank line between paragraphs is represented structurally
 * by separate <p> tags (which rich editors render with proper spacing).
 */
export function markdownToHtml(markdown: string): string {
  marked.setOptions({
    gfm: true,
    breaks: true, // single newline -> <br>, so soft line breaks survive
  });

  // Render each top-level block separately so we can control spacing between
  // them precisely (and never inject spacing inside a list).
  const tokens = marked.lexer(markdown);
  const blocks: string[] = [];
  for (const token of tokens) {
    if (token.type === "space") continue; // blank-line tokens — we space via <br>
    let html = (marked.parser([token]) as string).trim();
    if (!html) continue;
    // Zero out each block's own margin. This is what makes spacing consistent
    // across editors: Docs/Gmail keep <p> margins (double gaps) while HubSpot
    // strips them (zero gap). Forcing margin:0 makes every block render tight,
    // so the single <br> below becomes the ONE source of spacing everywhere.
    html = html.replace(/^<(p|ul|ol|h[1-6]|blockquote|pre|table)(\s[^>]*)?>/i, (_m, tag, attrs) => {
      return `<${tag}${attrs ?? ""} style="margin:0;">`;
    });
    blocks.push(html);
  }

  // A single <br> between margin:0 blocks renders as exactly one blank line in
  // both editors that honor margins (Docs/Gmail) and ones that strip them
  // (HubSpot). Markdown targets (Slack/Notion) read the plain-text flavor, so
  // this HTML only affects rich-text destinations — where it's what we want.
  const body = blocks.join("\n<br>\n");

  // Prepend a UTF-8 charset hint. Without it, apps reading the clipboard's
  // public.html flavor default to Latin-1/Windows-1252 and mangle every
  // non-ASCII char (em dashes, smart quotes, NBSP) into mojibake like â€" / â€™.
  return `<meta charset="utf-8">\n` + body;
}
