import { Clipboard, showHUD, getPreferenceValues } from "@raycast/api";
import { redact } from "./engine";
import { addAuditEntry, getThreatFeeds } from "./storage";

export default async function RedactAndPaste() {
  try {
    const clipboardText = await Clipboard.readText();

    if (!clipboardText || clipboardText.trim().length === 0) {
      await showHUD("Clipboard is empty");
      return;
    }

    const preferences = getPreferenceValues<Preferences.RedactPaste>();
    const feeds = await getThreatFeeds();

    const result = redact(
      clipboardText,
      preferences.defaultMode,
      preferences.defaultPolicy,
      feeds
    );

    await Clipboard.paste(result.text);

    if (preferences.enableAudit && result.redactedCount > 0) {
      await addAuditEntry({
        timestamp: Date.now(),
        redactedCount: result.redactedCount,
        detectionTypes: [...new Set(result.detections.map((d) => d.type))],
        mode: preferences.defaultMode,
        policy: preferences.defaultPolicy,
        inputLength: clipboardText.length,
        outputLength: result.text.length,
      });
    }

    if (result.redactedCount === 0) {
      await showHUD("Pasted clean text");
    } else {
      await showHUD(
        `Pasted with ${result.redactedCount} redaction${
          result.redactedCount === 1 ? "" : "s"
        }`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showHUD(`Error: ${message}`);
  }
}
