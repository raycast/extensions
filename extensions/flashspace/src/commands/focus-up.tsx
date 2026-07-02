import { closeMainWindow } from "@raycast/api";
import { runFlashspaceAsync } from "../utils/cli";

export default async function FocusUp() {
  try {
    await runFlashspaceAsync(["focus", "--direction", "up"]);
    await closeMainWindow();
  } catch {
    // silent failure
  }
}
