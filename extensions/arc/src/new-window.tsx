import { closeMainWindow, showHUD } from "@raycast/api";
import { makeNewWindow } from "./arc";

export default async function Command() {
  try {
    await closeMainWindow();
    await makeNewWindow();
  } catch {
    await showHUD("❌ Failed opening a new window");
  }
}
