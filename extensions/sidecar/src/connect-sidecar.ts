import { showHUD, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { execFile, exec } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

interface Preferences {
  ipadName: string;
}

// Inline AppleScript from References/osascript
const appleScript = `
do shell script "open -b com.apple.systempreferences /System/Library/PreferencePanes/Displays.prefPane"

set device to (system attribute "Device_Name")
set mirrorSectionName to (system attribute "Mirror_Section_Name")

tell application "System Events"
	repeat until (exists window 1 of application process "System Settings")
		delay 0.1
	end repeat

	tell process "System Settings"
		set popUpButton to pop up button 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1

		repeat until exists popUpButton
			delay 0.1
		end repeat

		click popUpButton

		repeat until exists menu 1 of popUpButton
			delay 0.1
		end repeat

		tell menu 1 of popUpButton
			-- Loop through the menu items and find the index that satisfies the condition
			set menuItemIndex to 0
			set mirrorFound to false
			repeat with i from 1 to count of menu items
				set currentItem to menu item i
				if mirrorFound then
					if name of currentItem contains device then
						set menuItemIndex to i
						exit repeat
					end if
				else
					if name of currentItem contains mirrorSectionName then
						set mirrorFound to true
					end if
				end if
			end repeat

			-- If a matching menu item was found, click it
			if menuItemIndex is not 0 then
				click menu item menuItemIndex
			else
				display dialog "No matching menu item containing '" & device & "' was found. Please, check your settings." buttons {"OK"} default button "OK"
			end if

			-- Wait until the menu is no longer visible
			repeat while exists menu 1 of popUpButton
				delay 0.1
			end repeat
		end tell
	end tell
end tell

tell application "System Settings" to quit
`;

const MIRROR_SECTION_NAME = "Mirror or extend to";

async function getSidecarState(): Promise<boolean> {
  const { stdout } = await execAsync("/usr/sbin/system_profiler SPDisplaysDataType", { shell: "/bin/zsh" });
  return stdout.toLowerCase().includes("sidecar");
}

async function waitForStateChange(initialState: boolean): Promise<boolean | null> {
  // Check up to 6 times with 1-second intervals
  for (let i = 0; i < 6; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const currentState = await getSidecarState();

    // If state changed from initial state, return the new state
    if (currentState !== initialState) {
      return currentState;
    }
  }

  // If no state change detected after all attempts, return null
  return null;
}

export default async function main() {
  const { ipadName } = getPreferenceValues<Preferences>();

  try {
    await showToast({ style: Toast.Style.Animated, title: "Toggling Sidecar..." });

    // Get initial state
    const initialState = await getSidecarState();

    // Run AppleScript
    await execFileAsync("osascript", ["-e", appleScript], {
      env: {
        ...process.env,
        Device_Name: ipadName,
        Mirror_Section_Name: MIRROR_SECTION_NAME,
      },
    });

    // Wait for state change and check final state
    const newState = await waitForStateChange(initialState);

    if (newState === null) {
      // No state change detected
      await showToast({
        style: Toast.Style.Failure,
        title: "Sidecar action failed",
        message: "No state change detected. Please try again.",
      });
    } else if (newState) {
      // Connected
      await showHUD("Sidecar Connected");
    } else {
      // Disconnected
      await showHUD("Sidecar Disconnected");
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error with Sidecar",
      message: String(error),
    });
  }
}
