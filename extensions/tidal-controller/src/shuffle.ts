import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

import { runTidalCommand, showMessage, getMenuOptions } from "./util/fn";

export default async function doShuffle() {
  await runTidalCommand(async () => {
    // Close the main window
    await closeMainWindow();
    // Send shuffle command
    const result = await runAppleScript(`
      tell application "System Events"
        tell process "TIDAL"
          set shuffleMenuItem to menu item "${getMenuOptions().shuffle}" of menu "${getMenuOptions().playback}" of menu bar 1
          set wasShuffled to value of attribute "AXMenuItemMarkChar" of shuffleMenuItem is not missing value
          click shuffleMenuItem
          return wasShuffled
        end tell
      end tell
    `);
    const wasShuffled = result === "true";
    showMessage(wasShuffled ? "Tidal: Shuffle toggled off 🔀" : "Tidal: Shuffle toggled on 🔀");
  });
}
