import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  try {
    const phase = await runAppleScript(`
    tell application "VLC"
        stop 
    end tell
    `);
    console.log(phase);
  } catch (e) {
    console.log(e);
  }
  await closeMainWindow();
};
