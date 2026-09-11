import { closeMainWindow, showHUD } from "@raycast/api";
import { runFlashspaceAsync } from "../utils/cli";

export default async function HideUnassignedApps() {
  try {
    await runFlashspaceAsync(["hide-unassigned-apps"]);
    await showHUD("Unassigned apps hidden");
    await closeMainWindow();
  } catch {
    await showHUD("Failed to hide unassigned apps");
  }
}
