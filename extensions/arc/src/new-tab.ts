import { closeMainWindow, showHUD } from "@raycast/api";
import { makeNewTab } from "./arc";

export default async function command() {
  try {
    await closeMainWindow();
    await makeNewTab();
  } catch (e) {
    console.error(e);

    await showHUD("❌ Failed opening a new tab");
  }
}
