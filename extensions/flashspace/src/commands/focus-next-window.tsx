import { closeMainWindow } from "@raycast/api";
import { runFlashspaceAsync } from "../utils/cli";

export default async function FocusNextWindow() {
  try {
    await runFlashspaceAsync(["focus", "--next-window"]);
    await closeMainWindow();
  } catch {
    // silent failure
  }
}
