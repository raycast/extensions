import { closeMainWindow, getPreferenceValues, showHUD } from "@raycast/api";
import { importRecentHistory } from "./study-service";

export default async function importRecentHistoryCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const result = await importRecentHistory(preferences.autoLowercase);

  await closeMainWindow();

  if (result.addedWords.length === 0 && result.updatedWords.length === 0) {
    await showHUD("No English words found in recent clipboard history");
    return;
  }

  await showHUD(`Imported ${result.addedWords.length + result.updatedWords.length} word(s) from recent history`);
}
