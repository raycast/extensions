import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  await closeMainWindow();
  await runAppleScript('try \n tell application "QuickTime Player" to start (new screen recording) \n end try');
};
