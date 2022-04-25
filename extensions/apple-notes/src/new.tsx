import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  await closeMainWindow();
  await runAppleScript(
    'tell application "Notes" to activate \n' +
      'tell application "System Events" to tell process "Notes" to ¬\n' +
      "click menu item 1 of menu 1 of ¬\n" +
      "menu bar item 3 of menu bar 1"
  );
};
