import {
  showToast,
  Toast,
  closeMainWindow,
  Clipboard,
  getPreferenceValues,
  showHUD,
} from "@raycast/api";
import { parseScript, typeWithDelay, showCountdown } from "./utils/typing";

export default async function Command() {
  const preferences = getPreferenceValues();

  try {
    // Get clipboard content
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showHUD("❌ Clipboard is empty");
      return;
    }

    // Parse preferences
    const baseDelay = parseInt(preferences.baseDelay) || 50;
    const countdownDuration = parseInt(preferences.countdownDuration) || 3;
    const showToastsEnabled = preferences.showToasts !== false;

    if (baseDelay < 0 || baseDelay > 1000) {
      await showHUD("❌ Base delay must be between 0 and 1000ms");
      return;
    }

    if (countdownDuration < 0 || countdownDuration > 10) {
      await showHUD("❌ Countdown must be between 0 and 10 seconds");
      return;
    }

    // Close window immediately
    await closeMainWindow();

    // Show countdown
    await showCountdown(countdownDuration, showToastsEnabled);

    // Parse the script
    const tokens = parseScript(clipboardText);

    // Start typing
    await typeWithDelay(tokens, baseDelay, showToastsEnabled);
  } catch (error) {
    const showToastsEnabled = preferences.showToasts !== false;
    if (showToastsEnabled) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Typing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
