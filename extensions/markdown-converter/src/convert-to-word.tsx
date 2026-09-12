/**
 * Raycast command to convert clipboard text to Word 365 optimized HTML.
 * Smart detection: if clipboard has rich text, round-trips through Markdown first.
 */
import { Clipboard, showHUD } from "@raycast/api";
import { getFormatLabel } from "./core/format-detection.js";
import { convertMarkdownToHtml, convertPlainTextToHtml } from "./core/md-to-html.js";
import { convertOrgToHtml } from "./core/org-to-html.js";
import { HtmlTarget } from "./core/html-targets.js";
import { raycastConverter } from "./raycast-converter.js";

const TARGET: HtmlTarget = "word";

export default async function ConvertToWord() {
  try {
    const content = await raycastConverter.getClipboardContent();

    if (!content) {
      await showHUD("✗ No text found in clipboard");
      return;
    }

    const { text, sourceWasRichText, detectedFormat } = content;
    const formatLabel = getFormatLabel(detectedFormat);

    let html: string;

    switch (detectedFormat) {
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
      html: html,
    });

    const via = sourceWasRichText ? "Rich text → Markdown → Word" : `${formatLabel} → Word`;
    await showHUD(`✓ ${via}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    await showHUD(`✗ Conversion failed: ${errorMessage}`);
  }
}
