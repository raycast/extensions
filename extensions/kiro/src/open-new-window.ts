import { Toast, closeMainWindow, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

const makeNewWindow = async () => {
  await runAppleScript(`
    tell application "Kiro"
	    activate
    end tell
    delay(0.5)
    tell application "Kiro"
	    activate
    end tell

    tell application "System Events"
	    tell process "Kiro"
		    click menu item "New Window" of menu "File" of menu bar 1
	    end tell
    end tell
  `);
};

export default async function command() {
  try {
    await closeMainWindow();
    await makeNewWindow();
  } catch (error) {
    await showToast({
      title: "Failed opening new window",
      style: Toast.Style.Failure,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
