import { Clipboard, closeMainWindow, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { Preferences } from "./types/preferences";

export default async () => {
  const { appendSeparator } = await getPreferenceValues<Preferences>();
  await closeMainWindow({ clearRootSearch: false });
  const appendText = await getSelectedText();
  const clipBoardText = await Clipboard.readText();
  const finalText = appendText + appendSeparator + clipBoardText;
  await Clipboard.copy(finalText);
  await showHUD(`✅ Prepended text to clipboard`);
};
