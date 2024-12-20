import { showHUD, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function Command() {
  await showHUD("VPN connection up and running!");
  await closeMainWindow();
  await runAppleScript(`
			 tell application "Viscosity" 
			   set connectionName to name of the first connection
			   connect connectionName
 			 end tell
			`);
}
