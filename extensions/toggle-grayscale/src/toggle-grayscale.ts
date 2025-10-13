import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

const appleScript = `
-- Make sure System Settings is closed before starting to avoid being blocked by modals
if application "System Settings" is running then
	tell application "System Settings" to quit
	repeat until application "System Settings" is not running
		delay 0.1
	end repeat
end if

-- Directly open Accessibility Display settings
do shell script "open 'x-apple.systempreferences:com.apple.preference.universalaccess?Seeing_Display'"

tell application "System Events"
	tell process "System Settings"
		-- Wait for the window to appear and be ready
		repeat until (exists window 1)
			delay 0.1
		end repeat
		
		-- Toggle Color filters
		click checkbox 1 of group 5 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1
	end tell
end tell

-- Quit System Settings
tell application "System Settings" to quit
`;

export default async function main() {
  await runAppleScript(appleScript, [], { language: "AppleScript" });
  await showHUD("✨ Color filters toggled ✨");
}
