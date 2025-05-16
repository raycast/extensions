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
  
  tell application "System Settings"
  	activate
  end tell
  
  tell application "System Events"
  	tell process "System Settings"
  		-- Wait for load and click Accessibility
  		repeat until (exists menu item "Accessibility" of menu "View" of menu bar 1)
  			delay 0.1
  		end repeat
  		click menu item "Accessibility" of menu "View" of menu bar 1
  		
  		-- Wait for the Display button to be available and click it
  		repeat until (exists button 4 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1)
  			delay 0.1
  		end repeat
  		click button 4 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1
  		
  		-- toggle Color filters
  		click checkbox "Color filters" of group 5 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1
  	end tell
  end tell
  
  -- Quit System Settings
  tell application "System Settings" to quit
`;

export default async function main() {
  await runAppleScript(appleScript, [], { language: "AppleScript" });
  await showHUD("✨ Color filters toggled ✨");
}
