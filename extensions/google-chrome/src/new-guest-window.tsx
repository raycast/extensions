import { closeMainWindow, showHUD } from "@raycast/api";
import { createNewGuestWindow } from "./actions";

export default async function Command() {
  try {
    await closeMainWindow();
    await createNewGuestWindow();
  } catch {
    await showHUD("❌ Failed opening a new Google Chrome guest window");
  }
}
