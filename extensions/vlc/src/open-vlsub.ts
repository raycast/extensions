import { showHUD } from "@raycast/api";
import { exec } from "child_process";

export default function main() {
  showHUD("Opening VLsub, please wait...");
  const appleScript = `
    tell application "VLC"
      activate
      delay 2
    end tell
    tell application "System Events"
      tell process "VLC"
        set frontmost to true
        delay 1
        try
          set vlcMenu to menu bar item "VLC" of menu bar 1
          click vlcMenu
          delay 0.2
          set extMenuItem to menu item "Extensions" of menu 1 of vlcMenu
          click extMenuItem
          delay 0.2
          set extMenu to menu 1 of extMenuItem
          if (count of menu items of extMenu) > 0 then
            click menu item 1 of extMenu
          else
            display dialog "No items found in Extensions menu."
          end if
        on error errMsg
          display dialog "Could not trigger Extensions menu: " & errMsg
        end try
      end tell
    end tell
  `;
  exec(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`, (error) => {
    if (error) {
      showHUD("Failed to open VLsub");
    } else {
      showHUD("VLsub triggered");
    }
  });
}
