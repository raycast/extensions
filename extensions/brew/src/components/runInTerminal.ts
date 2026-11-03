import { closeMainWindow, getApplications, Image } from "@raycast/api";
import { runAppleScript, useCachedPromise } from "@raycast/utils";
import { preferences } from "../utils";

type TerminalApp = (typeof preferences)["terminalApp"];

const names: { [key in TerminalApp]: string } = {
  alacritty: "Alacritty",
  ghostty: "Ghostty",
  hyper: "Hyper",
  iterm: "iTerm",
  kitty: "kitty",
  terminal: "Terminal",
  warp: "Warp",
  wezterm: "WezTerm",
};

const icons: { [key in TerminalApp]: Image.ImageLike } = {
  alacritty: { fileIcon: "/Applications/Alacritty.app" },
  ghostty: { fileIcon: "/Applications/Ghostty.app" },
  hyper: { fileIcon: "/Applications/Hyper.app" },
  iterm: { fileIcon: "/Applications/iTerm.app" },
  kitty: { fileIcon: "/Applications/kitty.app" },
  terminal: { fileIcon: "/System/Applications/Utilities/Terminal.app" },
  warp: { fileIcon: "/Applications/Warp.app" },
  wezterm: { fileIcon: "/Applications/WezTerm.app" },
};

const appBundleIds: { [key in TerminalApp]: string } = {
  alacritty: "org.alacritty",
  ghostty: "com.mitchellh.ghostty",
  hyper: "co.zeit.hyper",
  iterm: "com.googlecode.iterm2",
  kitty: "org.kovidgoyal.kitty",
  terminal: "com.apple.terminal",
  warp: "dev.warp.Warp-Stable",
  wezterm: "com.github.wez.wezterm",
};

/**
 * Escape a string for use inside an AppleScript `"…"` literal: backslash first,
 * then the quote. A brew-recommended command is not always quote-free — `brew
 * doctor` hands back `git -C "/opt/homebrew" …` — and an unescaped quote closes
 * the literal and makes the whole script a syntax error.
 */
const escapeAppleScriptString = (s: string): string => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

/** Escape for a single-quoted shell word: close, escape, reopen. */
const escapeSingleQuoted = (s: string): string => s.replace(/'/g, `'\\''`);

const runCommandInTermAppleScript = (c: string, terminalApp: string): string => {
  const app = escapeAppleScriptString(terminalApp);
  return `
    tell application "${app}" to activate
    tell application "System Events" to tell process "${app}"
        keystroke "t" using command down
        delay 0.5
        keystroke "${escapeAppleScriptString(c)}"
        keystroke return
    end tell
  `;
};

const appleScripts: { [key in TerminalApp]: (c: string) => string } = {
  alacritty: (c: string) => runCommandInTermAppleScript(c, names.alacritty),
  ghostty: (c: string) => runCommandInTermAppleScript(c, names.ghostty),
  hyper: (c: string) => runCommandInTermAppleScript(c, names.hyper),
  // c is inside `bash -c '…'` inside an AppleScript literal: shell quoting first,
  // then AppleScript quoting, since the `'\''` escape must survive as written.
  iterm: (c: string) => `
    tell application "iTerm"
      set newWindow to create window with default profile command "bash -c '${escapeAppleScriptString(escapeSingleQuoted(c))}; read -n 1 -s -r -p \\"Press any key to exit - will not quit\\" ; echo' ; exit"
    end tell
    `,
  kitty: (c: string) => runCommandInTermAppleScript(c, names.kitty),
  // c is a bare command line inside the AppleScript literal `do script` runs —
  // no shell quoting wraps it, so only the AppleScript literal needs escaping.
  //
  // A running Terminal gets a new window. Its front tab may be the user's own
  // shell, which the trailing `exit` would end, or a "[Process completed]" tab
  // from an earlier command, where `do script` runs nothing. A launch opens a
  // window, so the command runs in that one.
  //
  // A new tab stays busy while the shell starts. Text sent before its prompt is
  // echoed once early and again on the prompt line, so wait for the prompt.
  terminal: (c: string) => `
    set cmd to "echo ; ${escapeAppleScriptString(c)} ; bash -c 'read -n 1 -s -r -p \\"Press any key to exit - will not quit\\"' ; exit"
    set wasRunning to application "Terminal" is running
    tell application "Terminal"
      activate
      if wasRunning then
        set t to do script ""
      else
        set t to selected tab of front window
      end if
      set deadline to (current date) + 5
      repeat while (busy of t or (count of processes of t) is 0) and (current date) < deadline
        delay 0.1
      end repeat
      do script cmd in t
    end tell
  `,
  warp: (c: string) => runCommandInTermAppleScript(c, names.warp),
  wezterm: (c: string) => runCommandInTermAppleScript(c, names.wezterm),
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
      await closeMainWindow(); // Close Raycast in case the brew cmd typed in raycast window
      await new Promise((resolve) => setTimeout(resolve, 400)); // Wait for Raycast to close
      const cmd = data ? appleScripts[preferences.terminalApp](command) : appleScripts.terminal(command);
      await runAppleScript(cmd);
      await closeMainWindow();
    },
  };
};
