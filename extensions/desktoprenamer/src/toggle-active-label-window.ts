import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function Command() {
  try {
    const result = await runAppleScript(`tell application "DesktopRenamer" to toggle active label`);
    const status = result === "true" ? "Visible" : "Hidden";
    await showHUD(`Active Label: ${status}`);
  } catch {
    await showHUD("Failed to toggle active label. Is DesktopRenamer running?");
  }
}
