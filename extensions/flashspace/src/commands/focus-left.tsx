import { closeMainWindow } from "@raycast/api";
import { runFlashspaceAsync } from "../utils/cli";

export default async function FocusLeft() {
  try {
    await runFlashspaceAsync(["focus", "--direction", "left"]);
    await closeMainWindow();
  } catch {
    // silent failure
  }
}
