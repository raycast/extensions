import { showHUD, closeMainWindow } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    await showHUD("VPN connections up and running!");
    await closeMainWindow();
    await runAppleScript('tell application "Viscosity" to connectall');
  } catch (error) {
    showFailureToast(error, { title: "Could not run AppleScript" });
  }
}
