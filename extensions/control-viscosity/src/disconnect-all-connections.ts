import { showHUD, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function Command() {
  await showHUD("All VPN connections are now disconnected!");
  await closeMainWindow();
  await runAppleScript('tell application "Viscosity" to disconnectall');
}
