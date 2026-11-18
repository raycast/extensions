import { closeMainWindow } from "@raycast/api";
import { runFlashspaceAsync } from "../utils/cli";

export default async function FocusPrevWindow() {
  try {
    await runFlashspaceAsync(["focus", "--prev-window"]);
    await closeMainWindow();
  } catch {
    // silent failure
  }
}
