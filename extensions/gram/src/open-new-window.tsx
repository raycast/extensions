import { closeMainWindow } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { gramBuild } from "./lib/preferences";

const makeNewWindow = async (): Promise<void> => {
  await runAppleScript(`
      tell application "${gramBuild}"
	    activate
      end tell
      delay(0.5)
      tell application "${gramBuild}"
	    activate
      end tell

      tell application "System Events"
	    tell process "${gramBuild}"
		    click menu item "New Window" of menu "File" of menu bar 1
	    end tell
      end tell
    `);
};

export default async function command(): Promise<void> {
  try {
    await closeMainWindow();
    await makeNewWindow();
  } catch (error) {
    await showFailureToast(error, { title: "Failed opening new window" });
  }
}
