import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

import { runTidalCommand, showMessage } from "./util/fn";

export default async function doPlayPause() {
  await runTidalCommand(async () => {
    // Close the main window
    await closeMainWindow();
    // Send play/pause command and check if now playing
    const isNowPlaying = await runAppleScript(`
        tell application "System Events"
          tell process "TIDAL"
            set menuName to name of menu item 0 of menu "Playback" of menu bar 1
            if menuName is "Pause" then
              click menu item "Pause" of menu "Playback" of menu bar 1
              return false
            else if menuName is "Play" then
              click menu item "Play" of menu "Playback" of menu bar 1
              return true
            end if
          end tell
        end tell
      `);
    showMessage(isNowPlaying === "true" ? "Tidal: Music is now playing ▶️" : "Tidal: Music is now paused ⏸️");
  });
}
