import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { preferences } from "../preferences";

export function runCommandInTerminal(command: string): void {
  runAppleScript(`
    tell application "${preferences.useIterm2 ? "iTerm" : "Terminal"}"
      ${
        preferences.useIterm2
          ? "set newWindow to create window with default profile command"
          : "do shell script \"open -a 'Terminal'\"\ndo script"
      } "bash -c '${command}; read -n 1 -s -r -p \\"Press any key to exit - will not quit\\" ; echo' ; exit" ${
    preferences.useIterm2 ? "" : "in selected tab of the front window"
  }
    end tell
  `);
  closeMainWindow();
}
