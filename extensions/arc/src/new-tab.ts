import { closeMainWindow, showHUD } from "@raycast/api";
import { makeNewTab } from "./arc";
import { newTabPreferences } from "./preferences";
import isUrl from "is-url";

export default async function command() {
  try {
    const newTabUrl = newTabPreferences.url;
    if (!isUrl(newTabUrl)) {
      throw new Error("Invalid URL defined in preferences");
    }

    await closeMainWindow();
    await makeNewTab(newTabUrl);
  } catch (e) {
    console.error(e);

    await showHUD("❌ Failed opening a new tab");
  }
}
