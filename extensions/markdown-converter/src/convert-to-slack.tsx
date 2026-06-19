/**
 * Raycast command to convert clipboard text to Slack mrkdwn format.
 * Smart detection: if clipboard has rich text, round-trips through Markdown first.
 */
import { Clipboard, showHUD } from "@raycast/api";
import { getFormatLabel } from "./core/format-detection.js";
import { convertMarkdownToSlack } from "./core/md-to-slack.js";
import { raycastConverter } from "./raycast-converter.js";

export default async function ConvertToSlack() {
  try {
    const content = await raycastConverter.getClipboardContent();

    if (!content) {
      await showHUD("✗ No text found in clipboard");
      return;
    }

    const { text, sourceWasRichText, detectedFormat } = content;
    const formatLabel = getFormatLabel(detectedFormat);

    const slack = convertMarkdownToSlack(text);

    if (!slack || !slack.trim()) {
      await showHUD("✗ Conversion produced empty result");
      return;
    }

    await Clipboard.copy(slack);

    const via = sourceWasRichText ? "Rich text → Markdown → Slack" : `${formatLabel} → Slack`;
    await showHUD(`✓ ${via}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    await showHUD(`✗ Conversion failed: ${errorMessage}`);
  }
}
