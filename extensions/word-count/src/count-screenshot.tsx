import { closeMainWindow, showHUD, getPreferenceValues } from "@raycast/api";
import { count } from "./lib/count";
import { readFromScreenshot } from "./utils";

interface Preferences {
  playSound?: boolean;
  ocrLanguage?: string;
}

export default async function Command() {
  await closeMainWindow();

  try {
    const preferences = getPreferenceValues<Preferences>();
    const text = await readFromScreenshot(preferences.playSound ?? false, preferences.ocrLanguage ?? "en-US");

    if (!text) {
      await showHUD("❌ Nothing to count!");
      return;
    }

    const result = count(text, true);

    // Format results for HUD display - simplified for single-line display
    const hudMessage = `${result.characters.toLocaleString()} characters · ${result.words.toLocaleString()} words`;

    await showHUD(hudMessage);
  } catch (error) {
    console.error("Screenshot count error:", error);
    await showHUD("❌ Nothing to count!");
  }
}
