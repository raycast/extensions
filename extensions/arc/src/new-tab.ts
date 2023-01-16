import { closeMainWindow, showHUD } from "@raycast/api";
import { makeNewTab } from "./arc";
import { newTabPreferences } from "./preferences";

export default async function command() {
  try {
    await closeMainWindow();
    await makeNewTab(newTabPreferences.url);
  } catch (e) {
    console.error(e);

    await showHUD("❌ Failed opening a new tab");
  }
}
