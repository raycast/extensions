import { closeMainWindow, LocalStorage } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { APP } from "./types";

export default async () => {
  const app = (await LocalStorage.getItem<APP>("default-app")) || "QuickTime Player";
  try {
    let appleScript: string;

    if (app === "QuickTime Player") {
      appleScript = `
        tell application "QuickTime Player"
          tell document 1 to if exists then
            close
          end if
        end tell
      `;
    } else {
      // for VLC
      appleScript = `
        tell application "VLC"
          if playing then
            stop
          end if
          quit
        end tell
      `;
    }
    await runAppleScript(appleScript);
  } catch (e) {
    console.error(e);
  }
  await closeMainWindow();
};
