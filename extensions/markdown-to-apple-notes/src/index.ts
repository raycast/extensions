import { showHUD, Clipboard } from "@raycast/api";
import { marked, Renderer } from "marked";

// Reject inputs larger than 500 KB — protects against clipboard-bomb hangs.
const MAX_INPUT_BYTES = 500_000;

// Custom renderer that drops raw HTML blocks and inline HTML from the source.
// This prevents literal <script>, <iframe> etc. in clipboard content from
// being injected verbatim into the output HTML.
const safeRenderer = new Renderer();
safeRenderer.html = () => "";

/**
 * Apple Notes only recognises three heading levels:
 *   h1 → Title
 *   h2 → Heading
 *   h3 → Subheading
 *
 * Remap h4–h6 to h3 so they still render as Subheading
 * instead of unstyled text.
 */
function normalizeHeadings(html: string): string {
  return html
    .replace(/<h[4-6]([^>]*)>/gi, "<h3$1>")
    .replace(/<\/h[4-6]>/gi, "</h3>");
}

/**
 * Injects an empty paragraph spacer before and after every heading so
 * Apple Notes renders visible whitespace around them for readability.
 */
function addSpacingAroundHeadings(html: string): string {
  const spacer = "<p><br></p>";
  return html
    .replace(/(<h[1-3][^>]*>)/gi, `${spacer}$1`)
    .replace(/(<\/h[1-3]>)/gi, `$1${spacer}`);
}

/**
 * Plain-text fallback used when the target app doesn't accept HTML.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-3]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default async function main() {
  try {
    const markdownText = await Clipboard.readText();

    if (!markdownText || markdownText.trim() === "") {
      await showHUD("Clipboard is empty — nothing to convert.");
      return;
    }

    if (Buffer.byteLength(markdownText, "utf8") > MAX_INPUT_BYTES) {
      await showHUD("Clipboard content is too large to convert.");
      return;
    }

    // Convert markdown → HTML. Raw HTML in the source is stripped by
    // safeRenderer so only markdown-derived tags reach the output.
    const rawHtml = marked.parse(markdownText, {
      renderer: safeRenderer,
    }) as string;

    // Remap h4–h6 to h3 (Apple Notes only has Title/Heading/Subheading)
    const normalizedHtml = normalizeHeadings(rawHtml);

    // Inject spacers around headings
    const spacedHtml = addSpacingAroundHeadings(normalizedHtml);

    // Plain-text fallback
    const plainText = htmlToPlainText(spacedHtml);

    await Clipboard.copy({ html: spacedHtml, text: plainText });
    await Clipboard.paste({ html: spacedHtml, text: plainText });

    await showHUD("Pasted as rich text with spaced headings.");
  } catch (error) {
    await showHUD("Failed to convert Markdown.");
    console.error("markdown-to-notes error:", error);
  }
}
