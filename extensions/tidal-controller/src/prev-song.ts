import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

import { runTidalCommand, showMessage, getMenuOptions } from "./util/fn";

export default async function doPrevSong() {
  await runTidalCommand(async () => {
    await closeMainWindow();
    await runAppleScript(`
      tell application "System Events"
        tell process "TIDAL"
          click menu item "${getMenuOptions().previous}" of menu "${getMenuOptions().playback}" of menu bar 1
        end tell
      end tell`);
    showMessage("Tidal: Previous song ⏮️");
  });
}
