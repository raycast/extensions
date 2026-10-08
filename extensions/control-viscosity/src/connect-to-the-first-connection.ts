import { showHUD, closeMainWindow } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    await showHUD("VPN connection up and running!");
    await closeMainWindow();
    await runAppleScript(`
			 tell application "Viscosity" 
			   set connectionName to name of the first connection
			   connect connectionName
 			 end tell
			`);
  } catch (error) {
    showFailureToast(error, { title: "Could not run AppleScript" });
  }
}
