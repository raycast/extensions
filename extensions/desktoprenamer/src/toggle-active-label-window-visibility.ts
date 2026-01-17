import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function Command() {
  try {
    const result = await runAppleScript(`tell application "DesktopRenamer" to toggle desktop visibility`);
    const status = result === "true" ? "Visible" : "Hidden";
    await showHUD(`Desktop Label: ${status}`);
  } catch {
    await showHUD("Failed to toggle desktop visibility. Is DesktopRenamer running?");
  }
}
