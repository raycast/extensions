import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function Command() {
  try {
    const result = await runAppleScript(`tell application "DesktopRenamer" to toggle menubar`);
    const status = result === "true" ? "Visible" : "Hidden";
    await showHUD(`Menubar Item: ${status}`);
  } catch {
    await showHUD("Failed to toggle menubar item. Is DesktopRenamer running?");
  }
}
