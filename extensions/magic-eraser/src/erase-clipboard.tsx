import { Clipboard, showHUD } from "@raycast/api";
import { readClipboardHtml } from "./lib/clipboard-html";
import { htmlToMarkdown } from "./lib/html-to-markdown";
import { markdownToHtml } from "./lib/markdown-to-html";
import { delist } from "./lib/erase";

export default async function Command() {
  try {
    // Read the HTML flavor (where bold/links/structure live); fall back to text.
    const html = readClipboardHtml();
    const text = await Clipboard.readText();

    let md = "";
    if (html && html.trim()) {
      try {
        md = htmlToMarkdown(html);
      } catch {
        md = "";
      }
    }
    if (!md) md = text?.trim() ?? "";
    if (!md) {
      await showHUD("❌ Clipboard is empty");
      return;
    }

    // Remove only list/checkbox markers — keep bold, italics, links, spacing.
    const cleaned = delist(md);

    // Write BOTH flavors, like Magic Formatter: markdown plain text + rich HTML.
    // Rich targets (Docs/Gmail/HubSpot) get bold/links + clean spacing; markdown
    // targets (Slack/Notion) get the cleaned markdown.
    const richHtml = markdownToHtml(cleaned);
    await Clipboard.copy({ text: cleaned, html: richHtml });

    await showHUD("🧹 List markers removed — formatting kept");
  } catch (e) {
    await showHUD(`❌ Error: ${e instanceof Error ? e.message : String(e)}`);
  }
}
