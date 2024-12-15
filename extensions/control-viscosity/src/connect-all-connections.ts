import { showHUD, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function Command() {
  await showHUD("VPN connections up and running!");
  await closeMainWindow();
  await runAppleScript('tell application "Viscosity" to connectall');
}
