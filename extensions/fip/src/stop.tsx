import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  try {
    await runAppleScript(`
    tell application "Quicktime Player"
        stop 
    end tell
    `);
  } catch (e) {
    console.error(e);
  }
  await closeMainWindow();
};
