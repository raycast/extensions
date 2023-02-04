import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  await closeMainWindow();
  const test = await runAppleScript(`
    tell application "Reflect" to activate
    tell application "System Events" to tell process "Reflect" to ¬
    click menu item "Select Daily Note" of menu "Go" of menu bar 1
  `);

    console.log(test)
};