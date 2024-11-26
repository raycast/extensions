import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

import { runTidalCommand, showMessage, getMenuOptions } from "./util/fn";

export default async function doPause() {
  await runTidalCommand(async () => {
    // Close the main window
    await closeMainWindow();
    // Send play/pause command
    await runAppleScript(`
      tell application "System Events"
        tell process "TIDAL"
          if name of menu item 0 of menu "${getMenuOptions().playback}" of menu bar 1 is "${getMenuOptions().pause}" then
            click menu item "${getMenuOptions().pause}" of menu "${getMenuOptions().playback}" of menu bar 1 
          end if
        end tell
      end tell`);
    showMessage("Tidal: Music is now paused ⏸️");
  });
}
