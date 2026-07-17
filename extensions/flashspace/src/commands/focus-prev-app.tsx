import { closeMainWindow } from "@raycast/api";
import { runFlashspaceAsync } from "../utils/cli";

export default async function FocusPrevApp() {
  try {
    await runFlashspaceAsync(["focus", "--prev-app"]);
    await closeMainWindow();
  } catch {
    // silent failure
  }
}
