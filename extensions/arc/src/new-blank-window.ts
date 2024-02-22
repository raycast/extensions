import { closeMainWindow, showHUD } from "@raycast/api";
import { makeNewBlankWindow } from "./arc";
export default async function command() {
  try {
    await closeMainWindow();
    await makeNewBlankWindow();
  } catch {
    await showHUD("❌ Failed opening a new blank window");
  }
}
