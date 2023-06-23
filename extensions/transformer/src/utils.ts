import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";

export async function resolveBasedOnPreferences(text: string) {
  const preferences = getPreferenceValues<Preferences>();

  if (preferences.copyToClipboard) {
    await Clipboard.copy(text);
    showHUD("Copied to clipboard");
  }

  if (preferences.pasteToSelection) {
    await Clipboard.paste(text);
  }
}
