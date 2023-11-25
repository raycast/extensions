import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  await closeMainWindow();
  await runAppleScript(
    'tell application "System Events" to tell dock preferences \n set screen edge to left \n end tell'
  );
};
