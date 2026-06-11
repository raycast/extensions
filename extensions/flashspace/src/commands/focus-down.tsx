import { closeMainWindow } from "@raycast/api";
import { runFlashspaceAsync } from "../utils/cli";

export default async function FocusDown() {
  try {
    await runFlashspaceAsync(["focus", "--direction", "down"]);
    await closeMainWindow();
  } catch {
    // silent failure
  }
}
