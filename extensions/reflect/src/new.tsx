import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  await closeMainWindow();
  await runAppleScript(`
    tell application "Reflect" to activate
    tell application "System Events" to tell process "Reflect" to ¬
    click menu item "New Note" of menu "File" of menu bar 1
  `);
};