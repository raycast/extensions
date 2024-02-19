import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

function runAppleScriptAction() {
  return runAppleScript(`
    tell application "Arc"
	    activate
    end tell

     delay 1

    tell application "System Events"
	    tell process "Arc"
          set frontmost to true
      
          keystroke "o" using {command down}
          delay 1
      
          click menu item "New Note" of menu 1 of menu bar item "File" of menu bar 1
	      end tell
      end tell
  `);
}

export default async function command() {
  try {
    await runAppleScriptAction();
  } catch {
    await showHUD("❌ Failed opening a new note");
  }
}
