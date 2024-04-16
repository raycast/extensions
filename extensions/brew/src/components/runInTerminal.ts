import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { preferences } from "../preferences";

const terminalApp = preferences.terminalApp || "terminal";

const names: { [key in typeof terminalApp]: string } = {
  terminal: "Terminal",
  iterm: "iTerm",
  warp: "Warp",
};

const appleScripts: { [key in typeof terminalApp]: (c: string) => string } = {
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
  warp: (c: string) => `
    tell application "Warp" to activate
    tell application "System Events" to tell process "Warp"
        keystroke "t" using command down
        keystroke "${c}"
        delay 1.0
        key code 36
    end tell
`,
  /// warp does not provide an URI or anyway to pass commands so this was a workaround
};

export function terminalName(): string {
  return names[terminalApp];
}

export function runCommandInTerminal(command: string): void {
  runAppleScript(appleScripts[terminalApp](command));
  closeMainWindow();
}
