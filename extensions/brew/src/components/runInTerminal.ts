import { closeMainWindow, Image } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { preferences } from "../preferences";

const terminalApp = preferences.terminalApp || "terminal";

const names: { [key in typeof terminalApp]: string } = {
  terminal: "Terminal",
  iterm: "iTerm",
  warp: "Warp",
  kitty: "kitty",
  alacritty: "Alacritty",
  wezterm: "WezTerm",
  hyper: "Hyper",
};

const icons: { [key in typeof terminalApp]: Image.ImageLike } = {
  terminal: { fileIcon: "/System/Applications/Utilities/Terminal.app" },
  iterm: { fileIcon: "/Applications/iTerm.app" },
  warp: { fileIcon: "/Applications/Warp.app" },
  kitty: { fileIcon: "/Applications/kitty.app" },
  alacritty: { fileIcon: "/Applications/Alacritty.app" },
  wezterm: { fileIcon: "/Applications/WezTerm.app" },
  hyper: { fileIcon: "/Applications/Hyper.app" },
};

const runCommandInTermAppleScript = (c: string, terminalApp: string): string => `
    tell application "${terminalApp}" to activate
    tell application "System Events" to tell process "${terminalApp}"
        keystroke "t" using command down
        delay 0.5
        keystroke "${c}"
        keystroke return
    end tell
  `;

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
  kitty: (c: string) => runCommandInTermAppleScript(c, names.kitty),
  alacritty: (c: string) => runCommandInTermAppleScript(c, names.alacritty),
  warp: (c: string) => runCommandInTermAppleScript(c, names.warp),
  wezterm: (c: string) => runCommandInTermAppleScript(c, names.wezterm),
  hyper: (c: string) => runCommandInTermAppleScript(c, names.hyper),
};

export function terminalName(): string {
  return names[terminalApp];
}

export function terminalIcon(): Image.ImageLike {
  return icons[terminalApp];
}

export function runCommandInTerminal(command: string): void {
  runAppleScript(appleScripts[terminalApp](command));
  closeMainWindow();
}
