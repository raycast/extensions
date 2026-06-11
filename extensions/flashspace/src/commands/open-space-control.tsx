import { closeMainWindow, showHUD } from "@raycast/api";
import { runFlashspaceAsync } from "../utils/cli";

export default async function OpenSpaceControl() {
  try {
    await runFlashspaceAsync(["open-space-control"]);
    await showHUD("Space Control opened");
    await closeMainWindow();
  } catch {
    await showHUD("Failed to open Space Control");
  }
}
