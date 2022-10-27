import { Clipboard, closeMainWindow, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { Preferences } from "../types/preferences";

export async function getAppendedText(append = true) {
  const { appendSeparator } = await getPreferenceValues<Preferences>();
  await closeMainWindow({ clearRootSearch: false });
  const appendText = await getSelectedText();
  const clipBoardText = await Clipboard.readText();
  let finalText: string;
  if (append) {
    finalText = typeof clipBoardText === "string" ? clipBoardText + appendSeparator + appendText : appendText;
    await showHUD(`✅ Appended text to clipboard`);
  } else {
    finalText = typeof clipBoardText === "string" ? appendText + appendSeparator + clipBoardText : appendText;
    await showHUD(`✅ Prepended text to clipboard`);
  }
  await Clipboard.copy(finalText);
}
