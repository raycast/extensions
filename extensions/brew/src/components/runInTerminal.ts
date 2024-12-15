import { closeMainWindow, getApplications, Image } from "@raycast/api";
import { runAppleScript, useCachedPromise } from "@raycast/utils";
import { preferences } from "../preferences";

type TerminalApp = (typeof preferences)["terminalApp"];

const names: { [key in TerminalApp]: string } = {
  terminal: "Terminal",
  iterm: "iTerm",
  warp: "Warp",
  kitty: "kitty",
  alacritty: "Alacritty",
  wezterm: "WezTerm",
  hyper: "Hyper",
};

const icons: { [key in TerminalApp]: Image.ImageLike } = {
  terminal: { fileIcon: "/System/Applications/Utilities/Terminal.app" },
  iterm: { fileIcon: "/Applications/iTerm.app" },
  warp: { fileIcon: "/Applications/Warp.app" },
  kitty: { fileIcon: "/Applications/kitty.app" },
  alacritty: { fileIcon: "/Applications/Alacritty.app" },
  wezterm: { fileIcon: "/Applications/WezTerm.app" },
  hyper: { fileIcon: "/Applications/Hyper.app" },
};

const appBundleIds: { [key in TerminalApp]: string } = {
  terminal: "com.apple.terminal",
  iterm: "com.googlecode.iterm2",
  warp: "dev.warp.Warp-Stable",
  kitty: "org.kovidgoyal.kitty",
  alacritty: "org.alacritty",
  wezterm: "com.github.wez.wezterm",
  hyper: "co.zeit.hyper",
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

const appleScripts: { [key in TerminalApp]: (c: string) => string } = {
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

export const useTerminalApp = () => {
  const { data } = useCachedPromise(
    async (terminalApp: TerminalApp) => {
      const apps = await getApplications();
      return apps.some((app) => app.bundleId?.toLowerCase() === appBundleIds[terminalApp].toLowerCase());
    },
    [preferences.terminalApp],
    { failureToastOptions: { title: "Failed to check if Terminal App is installed" } },
  );

  return {
    terminalIcon: data ? icons[preferences.terminalApp] : icons.terminal,
    terminalName: data ? names[preferences.terminalApp] : names.terminal,
    runCommandInTerminal: async (command: string) => {
      const cmd = data ? appleScripts[preferences.terminalApp](command) : appleScripts.terminal(command);
      await runAppleScript(cmd);
      await closeMainWindow();
    },
  };
};
