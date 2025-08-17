import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

import { runTidalCommand, showMessage, getMenuOptions } from "./util/fn";

export default async function doPlay() {
  await runTidalCommand(async () => {
    // Close the main window
    await closeMainWindow();
    const menuOptions = getMenuOptions();
    // Send play/pause command
    await runAppleScript(`
      tell application "System Events"
        tell process "TIDAL"
          if name of menu item 0 of menu "${menuOptions.playback}" of menu bar 1 is "${menuOptions.play}" then
            click menu item "${menuOptions.play}" of menu "${menuOptions.playback}" of menu bar 1 
          end if
        end tell
      end tell`);
    showMessage("Tidal: Music is now playing ▶️");
  });
}
