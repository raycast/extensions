/**
 * Raycast command to convert clipboard text to generic HTML.
 * Detects format (Markdown, Org-mode, or plain text) and converts to HTML.
 */
import { Clipboard, showHUD } from "@raycast/api";
import { detectInputFormat, getFormatLabel } from "../../core/format-detection.js";
import { convertMarkdownToHtml, convertPlainTextToHtml } from "../../core/md-to-html.js";
import { convertOrgToHtml } from "../../core/org-to-html.js";
import { HtmlTarget } from "../../core/html-targets.js";

const TARGET: HtmlTarget = "html";

export default async function ConvertToHtml() {
  try {
    const text = await Clipboard.readText();

    if (!text || !text.trim()) {
      await showHUD("✗ No text found in clipboard");
      return;
    }

    const format = detectInputFormat(text);
    const formatLabel = getFormatLabel(format);

    let html: string;

    switch (format) {
      case "org":
        html = convertOrgToHtml(text, { target: TARGET });
        break;
      case "markdown":
        html = convertMarkdownToHtml(text, { target: TARGET });
        break;
      case "plain":
      default:
        html = convertPlainTextToHtml(text, { target: TARGET });
        break;
    }

    if (!html || !html.trim()) {
      await showHUD("✗ Conversion produced empty result");
      return;
    }

    await Clipboard.copy({
      text: text,
      html: html
    });

    await showHUD(`✓ Converted ${formatLabel} to HTML`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    await showHUD(`✗ Conversion failed: ${errorMessage}`);
  }
}
