import { closeMainWindow, showHUD } from "@raycast/api";
import { nameCurrentWindow } from "./actions";

export default async function Command() {
  try {
    await closeMainWindow();
    await nameCurrentWindow();
  } catch {
    await showHUD("❌ Failed to name the Google Chrome window");
  }
}
