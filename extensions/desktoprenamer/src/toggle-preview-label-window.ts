import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function Command() {
  try {
    const result = await runAppleScript(`tell application "DesktopRenamer" to toggle preview label`);
    const status = result === "true" ? "Visible" : "Hidden";
    await showHUD(`Preview Label: ${status}`);
  } catch {
    await showHUD("Failed to toggle preview label. Is DesktopRenamer running?");
  }
}
