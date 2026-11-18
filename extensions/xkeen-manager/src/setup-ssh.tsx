import { closeMainWindow, showToast, Toast, environment } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { chmodSync } from "fs";
import { join } from "path";

export default async function Command() {
  await closeMainWindow();

  // Look for the script in the assets directory
  const scriptPath = join(environment.assetsPath, "setup.sh");

  try {
    // Make it executable (just in case)
    chmodSync(scriptPath, "755");

    // AppleScript magic: open Terminal.app and run the script
    await runAppleScript(`
      tell application "Terminal"
        activate
        do script quoted form of "${scriptPath}"
      end tell
    `);

    await showToast({
      style: Toast.Style.Success,
      title: "Terminal Opened",
      message: "Follow instructions to setup SSH",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to launch",
      message: String(error),
    });
  }
}
