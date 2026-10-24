import { Clipboard, LocalStorage, showHUD } from "@raycast/api";
import { rehydrateText } from "./engine";

export default async function Command() {
  const clipboardText = await Clipboard.readText();
  if (!clipboardText) {
    await showHUD("Clipboard is empty or not text");
    return;
  }

  const mappingStr = await LocalStorage.getItem<string>("latest_mapping");
  if (!mappingStr) {
    await showHUD("No active mapping found to rehydrate");
    return;
  }

  try {
    const mapping = JSON.parse(mappingStr);
    const restoredText = rehydrateText(clipboardText, mapping);

    await Clipboard.copy(restoredText);
    await showHUD("Original Data Restored 💧");
  } catch {
    await showHUD("Error: Failed to parse mapping data.");
  }
}
