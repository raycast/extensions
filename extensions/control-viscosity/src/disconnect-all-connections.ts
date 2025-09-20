import { showHUD, closeMainWindow } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    await showHUD("All VPN connections are now disconnected!");
    await closeMainWindow();
    await runAppleScript('tell application "Viscosity" to disconnectall');
  } catch (error) {
    showFailureToast(error, { title: "Could not run AppleScript" });
  }
}
