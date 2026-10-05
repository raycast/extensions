import { closeMainWindow, showHUD } from "@raycast/api";
import { runFlashspaceAsync } from "../utils/cli";

export default async function OpenFlashSpace() {
  try {
    await runFlashspaceAsync(["open"]);
    await showHUD("FlashSpace opened");
    await closeMainWindow();
  } catch {
    await showHUD("Failed to open FlashSpace");
  }
}
