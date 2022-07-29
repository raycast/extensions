import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  await closeMainWindow();
  await runAppleScript(`
    tell application "Notes" to activate
    tell application "System Events" to tell process "Notes" to ¬
    click menu item 1 of menu 1 of ¬
    menu bar item 3 of menu bar 1
  `);
};
