import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

import { runTidalCommand, showMessage, getMenuOptions } from "./util/fn";

export default async function doVolumeDown() {
  await runTidalCommand(async () => {
    await closeMainWindow();
    const menuOptions = getMenuOptions();
    await runAppleScript(`
      tell application "System Events"
        tell process "TIDAL"
          click menu item "${menuOptions.volDown}" of menu "${menuOptions.playback}" of menu bar 1
        end tell
      end tell`);
    showMessage("Tidal: Volume down️ 🔈");
  });
}
