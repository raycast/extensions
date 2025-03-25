import { closeMainWindow, showHUD } from "@raycast/api";
import { openNewWindow } from "./actions";

export default async function Command() {
  try {
    await closeMainWindow();
    await openNewWindow();
  } catch {
    await showHUD("❌ Failed opening a new vivaldi window");
  }
}
