import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

const appleScript = `
  -- Make sure System Settings is closed before starting
  if application "System Settings" is running then
    tell application "System Settings" to quit
    delay 0.2
  end if

  tell application "System Settings"
    activate
  end tell

  delay 0.5

  tell application "System Events"
    tell process "System Settings"
      -- Click Accessibility
      click menu item "Accessibility" of menu "View" of menu bar 1
      
      delay 0.2
      
      -- Click Display under Vision section
      click button 3 of group 1 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1
      
      delay 0.3
      
      -- Click the Color Filters toggle (updated selector)
      click checkbox "Color filters" of group 5 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1
    end tell
  end tell

  -- Quit System Settings
  tell application "System Settings" to quit
`;

export default async function main() {
  const res = await runAppleScript(appleScript, [], { language: "AppleScript" });
  await showHUD(res);
}
