import { existsSync } from "node:fs";
import { osascript, run, shQuote } from "./exec";
import { Locator, ResumeTerminal } from "./types";

export const TERMINAL_BUNDLE = "com.apple.Terminal";
export const ITERM_BUNDLE = "com.googlecode.iterm2";
export const GHOSTTY_BUNDLE = "com.mitchellh.ghostty";

const TERM_PROGRAM_BUNDLES: Record<string, string> = {
  Apple_Terminal: TERMINAL_BUNDLE,
  "iTerm.app": ITERM_BUNDLE,
  ghostty: GHOSTTY_BUNDLE,
  WezTerm: "com.github.wez.wezterm",
  vscode: "com.microsoft.VSCode",
  WarpTerminal: "dev.warp.Warp-Stable",
};

export const TERMINAL_BUNDLES = new Set([
  TERMINAL_BUNDLE,
  ITERM_BUNDLE,
  GHOSTTY_BUNDLE,
  "com.github.wez.wezterm",
  "net.kovidgoyal.kitty",
  "org.alacritty",
  "io.alacritty",
  "dev.warp.Warp-Stable",
  "com.microsoft.VSCode",
  "com.todesktop.230313mzl4w4u92", // Cursor
]);

export function bundleFor(loc: Locator): string | undefined {
  if (loc.bundleId) return loc.bundleId;
  if (loc.termProgram && TERM_PROGRAM_BUNDLES[loc.termProgram]) return TERM_PROGRAM_BUNDLES[loc.termProgram];
  return undefined;
}

export function tmuxBinary(): string {
  for (const p of ["/opt/homebrew/bin/tmux", "/usr/local/bin/tmux", "/usr/bin/tmux"]) if (existsSync(p)) return p;
  return "tmux";
}

function tmuxArgs(loc: Locator, args: string[]): string[] {
  return loc.tmuxSocket ? ["-S", loc.tmuxSocket, ...args] : args;
}

export async function tmuxPaneAlive(loc: Locator): Promise<boolean> {
  if (!loc.tmuxPane) return false;
  const r = await run(tmuxBinary(), tmuxArgs(loc, ["display-message", "-p", "-t", loc.tmuxPane, "#{pane_id}"]));
  return r.ok && r.stdout.trim() === loc.tmuxPane;
}

/** Focus a tmux pane: switch the attached client to it, then raise the terminal app. */
export async function focusTmuxPane(loc: Locator, actions = { run, activateBundle }): Promise<boolean> {
  if (!loc.tmuxPane) return false;
  const tmux = tmuxBinary();
  const pane = loc.tmuxPane;
  const switched = await actions.run(tmux, tmuxArgs(loc, ["switch-client", "-t", pane]));
  const window = await actions.run(tmux, tmuxArgs(loc, ["select-window", "-t", pane]));
  const selected = await actions.run(tmux, tmuxArgs(loc, ["select-pane", "-t", pane]));
  const bundle = bundleFor(loc);
  const activated = bundle && bundle !== "tmux" ? await actions.activateBundle(bundle) : false;
  return window.ok && selected.ok && (switched.ok || activated);
}

export async function activateBundle(bundleId: string): Promise<boolean> {
  const r = await run("/usr/bin/open", ["-b", bundleId]);
  return r.ok;
}

/** Select the Terminal.app / iTerm2 tab or Ghostty surface that owns a tty. */
export async function focusTty(tty: string, bundleId: string | undefined, actions = { osascript }): Promise<boolean> {
  if (bundleId === TERMINAL_BUNDLE) {
    const r = await actions.osascript(
      `
on run argv
tell application "Terminal"
  repeat with w in windows
    repeat with t in tabs of w
      if tty of t is (item 1 of argv) then
        set selected of t to true
        set index of w to 1
        activate
        return "ok"
      end if
    end repeat
  end repeat
end tell
return "miss"
end run`,
      "AppleScript",
      [tty],
    );
    return r.ok && r.stdout.trim() === "ok";
  }
  if (bundleId === ITERM_BUNDLE) {
    const r = await actions.osascript(
      `
on run argv
tell application "iTerm2"
  repeat with w in windows
    repeat with t in tabs of w
      repeat with s in sessions of t
        if tty of s is (item 1 of argv) then
          select w
          select t
          select s
          activate
          return "ok"
        end if
      end repeat
    end repeat
  end repeat
end tell
return "miss"
end run`,
      "AppleScript",
      [tty],
    );
    return r.ok && r.stdout.trim() === "ok";
  }
  if (bundleId === GHOSTTY_BUNDLE) {
    // Ghostty 1.4 exposes terminal.tty; focus also selects its split, tab and window.
    const r = await actions.osascript(
      `
on run argv
tell application "Ghostty"
  repeat with term in terminals
    if tty of term is (item 1 of argv) then
      focus term
      return "ok"
    end if
  end repeat
end tell
return "miss"
end run`,
      "AppleScript",
      [tty],
    );
    return r.ok && r.stdout.trim() === "ok";
  }
  return false;
}

const TTY_PATH = /^\/dev\/(?:tty[A-Za-z0-9]+|pts\/\d+)$/;

/** The selected terminal's tty. The caller must establish which app is actually in front. */
export async function frontTty(bundleId: string, actions = { osascript }): Promise<string | undefined> {
  let script = "";
  if (bundleId === TERMINAL_BUNDLE)
    script = `tell application "Terminal"
  if (count of windows) is 0 then return ""
  return tty of selected tab of front window
end tell`;
  else if (bundleId === ITERM_BUNDLE)
    script = `tell application "iTerm2"
  if (count of windows) is 0 then return ""
  return tty of current session of current window
end tell`;
  else if (bundleId === GHOSTTY_BUNDLE)
    script = `tell application "Ghostty"
  if front window is missing value then return ""
  return tty of focused terminal of selected tab of front window
end tell`;
  else return undefined;
  const r = await actions.osascript(script);
  const tty = r.stdout.trim();
  return r.ok && TTY_PATH.test(tty) ? tty : undefined;
}

export interface TmuxClient {
  tty: string;
  pane: string;
  activity: number;
  socket: string;
}

/** Query one tmux server. Match client tty and socket; activity does not establish foreground focus. */
export async function tmuxClients(socket?: string, actions = { run }): Promise<TmuxClient[]> {
  const r = await actions.run(
    tmuxBinary(),
    tmuxArgs({ tmuxSocket: socket }, [
      "list-clients",
      "-F",
      "#{client_tty}\t#{pane_id}\t#{client_activity}\t#{socket_path}",
    ]),
  );
  if (!r.ok) return [];
  return r.stdout
    .split("\n")
    .map((l) => l.split("\t"))
    .filter((p) => p.length === 4 && TTY_PATH.test(p[0]) && /^%\d+$/.test(p[1]) && p[3].startsWith("/"))
    .map(([tty, pane, activity, reportedSocket]) => ({
      tty,
      pane,
      activity: Number(activity) || 0,
      socket: socket || reportedSocket,
    }));
}

/** Open a new terminal window running `command` in `cwd`. */
export async function openInTerminal(
  command: string,
  cwd: string,
  terminal: ResumeTerminal,
  actions = { run, osascript },
): Promise<boolean> {
  const line = cwd && existsSync(cwd) ? `cd ${shQuote(cwd)} && ${command}` : command;
  if (terminal === "iterm") {
    const r = await actions.osascript(
      `
on run argv
tell application "iTerm2"
  activate
  set w to (create window with default profile)
  tell current session of w to write text (item 1 of argv)
end tell
end run`,
      "AppleScript",
      [line],
    );
    if (r.ok) return true;
  }
  if (terminal === "ghostty") {
    const args = ["-na", "Ghostty", "--args"];
    if (cwd && existsSync(cwd)) args.push(`--working-directory=${cwd}`);
    args.push("-e", process.env.SHELL || "/bin/zsh", "-lc", command);
    const r = await actions.run("/usr/bin/open", args);
    if (r.ok) return true;
  }
  const r = await actions.osascript(
    `
on run argv
tell application "Terminal"
  activate
  do script (item 1 of argv)
end tell
end run`,
    "AppleScript",
    [line],
  );
  return r.ok;
}
