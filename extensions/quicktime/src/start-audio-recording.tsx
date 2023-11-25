import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  await closeMainWindow();
  await runAppleScript(
    'tell application "System Events" \n tell application "QuickTime Player" to activate frontmost \n tell application "QuickTime Player" to start (new audio recording) \n end tell'
  );
};
