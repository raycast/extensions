import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  try {
    const phrase = await runAppleScript(`
    tell application "QuickTime Player"
      tell document 1 to if exists then
         close
      end if
    end tell
    `);
  } catch (e) {
    console.error(e);
  }
  await closeMainWindow();
};
