import { getSelectedText, Clipboard, showHUD, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { telexTransform } from "./telex";

function loadCustomSkipWords(): string[] {
  try {
    const prefs = getPreferenceValues<{ customSkipWords?: string }>();
    if (prefs.customSkipWords) {
      return prefs.customSkipWords
        .split(/\r?\n/)
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean);
    }
  } catch {
    // Ignore if preference not set
  }
  return [];
}

export default async function Command() {
  try {
    const selectedText = await getSelectedText();

    if (!selectedText.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "No text selected" });
      return;
    }

    const extraSkipWords = loadCustomSkipWords();
    const result = telexTransform(selectedText, extraSkipWords);

    await Clipboard.paste(result);
    await Clipboard.copy(result);

    await showHUD("Copied to clipboard");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot transform text",
      message: String(error),
    });
  }
}
