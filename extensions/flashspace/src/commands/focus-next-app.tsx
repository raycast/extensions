import { closeMainWindow } from "@raycast/api";
import { runFlashspaceAsync } from "../utils/cli";

export default async function FocusNextApp() {
  try {
    await runFlashspaceAsync(["focus", "--next-app"]);
    await closeMainWindow();
  } catch {
    // silent failure
  }
}
