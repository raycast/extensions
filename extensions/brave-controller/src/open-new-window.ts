import { closeMainWindow, showHUD, PopToRootType } from "@raycast/api";
import { exec } from "child_process";

export default async function Command() {
  // Close the Raycast window immediately so focus shifts to the browser
  await closeMainWindow({ popToRootType: PopToRootType.Immediate });

  /**
   * Command Explanation:
   * open: The macOS command to open apps/files
   * -n: Open a new instance of the application even if one is running
   * -a "Brave Browser": Specifies the application
   * --args --new-window: specific Chromium argument to force a new window
   */
  const command = 'open -na "Brave Browser" --args --new-window';

  exec(command, (error) => {
    if (error) {
      console.error(error);
      showHUD("❌ Failed to open Brave");
    }
  });
}
