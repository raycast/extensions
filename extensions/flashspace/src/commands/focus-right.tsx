import { closeMainWindow } from "@raycast/api";
import { runFlashspaceAsync } from "../utils/cli";

export default async function FocusRight() {
  try {
    await runFlashspaceAsync(["focus", "--direction", "right"]);
    await closeMainWindow();
  } catch {
    // silent failure
  }
}
