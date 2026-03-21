/**
 * Raycast command to convert clipboard text to Slack mrkdwn format.
 * Detects format (Markdown, Org-mode, or plain text) and converts to Slack's mrkdwn syntax.
 */
import { Clipboard, showHUD } from "@raycast/api";
import { detectInputFormat, getFormatLabel } from "./core/format-detection.js";
import { convertMarkdownToSlack } from "./core/md-to-slack.js";

export default async function ConvertToSlack() {
  try {
    const text = await Clipboard.readText();

    if (!text || !text.trim()) {
      await showHUD("✗ No text found in clipboard");
      return;
    }

    const format = detectInputFormat(text);
    const formatLabel = getFormatLabel(format);

    // Convert to Slack mrkdwn
    // Note: For Org-mode, we pass it through as-is since the converter handles
    // Markdown syntax. A proper Org->Slack path would be better but this gives
    // reasonable results for now.
    const slack = convertMarkdownToSlack(text);

    if (!slack || !slack.trim()) {
      await showHUD("✗ Conversion produced empty result");
      return;
    }

    // Slack mrkdwn is plain text, not rich HTML
    await Clipboard.copy(slack);

    await showHUD(`✓ Converted ${formatLabel} to Slack mrkdwn`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    await showHUD(`✗ Conversion failed: ${errorMessage}`);
  }
}
