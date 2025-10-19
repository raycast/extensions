import { showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

const APPLE_SCRIPT = `
tell application "System Settings"
	activate
end tell

with timeout of 30 seconds
	tell application "System Events"
		repeat until exists process "System Settings"
			delay 0.1
		end repeat

		tell process "System Settings"
			repeat until exists menu bar 1
				delay 0.1
			end repeat

			repeat until exists menu item "Sound" of menu "View" of menu bar 1
				delay 0.1
			end repeat

			click menu item "Sound" of menu "View" of menu bar 1

			set windowReady to false
			repeat with tries from 1 to 150
				if exists window "Sound" then
					set windowReady to true
					exit repeat
				end if
				delay 0.1
			end repeat
			if windowReady is false then error "Sound window did not appear"

			repeat until exists radio button 2 of tab group 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Sound"
				delay 0.1
			end repeat
			click radio button 2 of tab group 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Sound"

			repeat until exists outline 1 of scroll area 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Sound"
				delay 0.1
			end repeat

			set microphoneRows to rows of outline 1 of scroll area 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Sound"
			set switched to false
			repeat with aRow in microphoneRows
				try
					set deviceName to value of static text 1 of group 1 of UI element 1 of aRow
					if deviceName contains "MacBook" and deviceName contains "Microphone" then
						select aRow
						set switched to true
						exit repeat
					end if
				on error
				end try
			end repeat
			if switched is false then error "Built-in microphone was not found"
		end tell
	end tell
end timeout
`;

export default async function command() {
  try {
    await runAppleScript(APPLE_SCRIPT);
    await showHUD("Built-in microphone selected");
  } catch (error) {
    await showToast(
      Toast.Style.Failure,
      "Failed to switch microphone",
      error instanceof Error ? error.message : undefined,
    );
    throw error;
  }
}
