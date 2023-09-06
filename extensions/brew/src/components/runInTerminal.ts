import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { preferences } from "../preferences";

const appleScripts: { [key in typeof preferences.terminalApp]: (c: string) => string } = {
  terminal: (c: string) => `
    tell application "Terminal"
      do shell script "open -a 'Terminal'"
      do script "echo ; ${c} ; bash -c 'read -n 1 -s -r -p \\"Press any key to exit - will not quit\\"' ; exit" in selected tab of the front window
    end tell
  `,
  iterm: (c: string) => `
    tell application "iTerm"
      set newWindow to create window with default profile command "bash -c '${c}; read -n 1 -s -r -p \\"Press any key to exit - will not quit\\" ; echo' ; exit"
    end tell
  `,
};

export function runCommandInTerminal(command: string): void {
  runAppleScript(appleScripts[preferences.terminalApp](command));
  closeMainWindow();
}
