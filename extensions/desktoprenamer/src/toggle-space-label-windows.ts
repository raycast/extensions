import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function Command() {
  try {
    const result = await runAppleScript(`tell application "DesktopRenamer" to toggle labels`);
    const status = result === "true" ? "Enabled" : "Disabled";
    await showHUD(`Labels: ${status}`);
  } catch {
    await showHUD("Failed to toggle labels. Is DesktopRenamer running?");
  }
}
