import { closeMainWindow, getPreferenceValues } from "@raycast/api";
import { GramBuild } from "./lib/gram";
import { runAppleScript, showFailureToast } from "@raycast/utils";

const preferences: Record<string, string> = getPreferenceValues();
const gramBuild: GramBuild = preferences.build as GramBuild;

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
