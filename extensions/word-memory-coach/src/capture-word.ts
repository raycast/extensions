import { Clipboard, closeMainWindow, getPreferenceValues, showHUD } from "@raycast/api";
import { captureWordsFromTexts } from "./storage";

export default async function captureWord() {
  const preferences = getPreferenceValues<Preferences>();
  const clipboardText = await Clipboard.readText();
  const result = await captureWordsFromTexts([clipboardText], "clipboard", preferences.autoLowercase);

  await closeMainWindow();

  if (result.addedWords.length === 0 && result.updatedWords.length === 0) {
    await showHUD("No English words found in the current clipboard");
    return;
  }

  const addedCount = result.addedWords.length;
  const updatedCount = result.updatedWords.length;
  await showHUD(`Saved ${addedCount + updatedCount} word(s) · ${result.totalWordsToday} total today`);
}
