import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export function runCommandInTerminal(command: string) {
  runAppleScript(`
    tell application "Terminal"
      do script "${command}"
    end tell
  `);
  closeMainWindow();
}
