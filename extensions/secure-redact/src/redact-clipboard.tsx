import { Clipboard, showHUD, getPreferenceValues } from "@raycast/api";
import { redact } from "./engine";
import { addAuditEntry, getThreatFeeds } from "./storage";
import { RedactionMode, DetectionPolicy } from "./types";

interface Preferences {
  defaultMode: RedactionMode;
  defaultPolicy: DetectionPolicy;
  enableAudit: boolean;
}

export default async function RedactClipboard() {
  try {
    const clipboardText = await Clipboard.readText();

    if (!clipboardText || clipboardText.trim().length === 0) {
      await showHUD("Clipboard is empty");
      return;
    }

    const preferences = getPreferenceValues<Preferences>();
    const feeds = await getThreatFeeds();

    const result = redact(
      clipboardText,
      preferences.defaultMode,
      preferences.defaultPolicy,
      feeds
    );

    if (result.redactedCount === 0) {
      await showHUD("Clipboard clean");
      return;
    }

    await Clipboard.copy(result.text);

    if (preferences.enableAudit) {
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

    await showHUD(
      `Redacted ${result.redactedCount} item${
        result.redactedCount === 1 ? "" : "s"
      }`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showHUD(`Error: ${message}`);
  }
}
