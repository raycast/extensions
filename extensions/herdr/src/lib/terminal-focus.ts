import { basename } from "node:path";

interface WezTermPane {
  window_id?: number;
  pane_id: number;
  tty_name?: string;
}

function appleScriptString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n")}"`;
}

function sessionMatches(args: string, sessionName?: string): boolean {
  const session = sessionName?.trim();
  const namedSession = args.match(/(?:^|\s)--session(?:=|\s+)([^\s]+)/)?.[1];
  const attachedSession = args.match(/(?:^|\s)session\s+attach\s+([^\s]+)/)?.[1];
  if (!session || session === "default") return !namedSession && !attachedSession;
  return namedSession === session || attachedSession === session;
}

export function parseHerdrClientTtys(output: string, binary: string, sessionName?: string): string[] {
  const binaryName = basename(binary);
  const ttys: string[] = [];
  for (const line of output.split("\n")) {
    const match = line.trim().match(/^(\S+)\s+(\S+)\s+(.+)$/);
    if (!match) continue;
    const [, tty, , args] = match;
    if (tty === "??" || tty === "?") continue;
    const executable = args
      .trim()
      .split(/\s+/, 1)[0]
      .replace(/^['"]|['"]$/g, "");
    if (basename(executable) !== binaryName && basename(executable) !== "herdr") continue;
    if (!sessionMatches(args, sessionName)) continue;
    ttys.push(tty.startsWith("/dev/") ? tty : `/dev/${tty}`);
  }
  return [...new Set(ttys)];
}

export function buildTerminalFocusScript(ttys: string[]): string {
  const values = ttys.map(appleScriptString).join(", ");
  return `set targetTtys to {${values}}
tell application "Terminal"
  repeat with w in windows
    repeat with t in tabs of w
      if targetTtys contains (tty of t) then
        set selected of t to true
        set frontmost of w to true
        activate
        return tty of t
      end if
    end repeat
  end repeat
  return "miss"
end tell`;
}

export function buildITermFocusScript(ttys: string[]): string {
  const filter = ttys.map((tty) => `tty is ${appleScriptString(tty)}`).join(" or ");
  return `tell application "iTerm"
  set matches to every session of every tab of every window whose ${filter}
  repeat with windowIndex from 1 to count matches
    set windowMatches to item windowIndex of matches
    repeat with tabIndex from 1 to count windowMatches
      set tabMatches to item tabIndex of windowMatches
      if (count tabMatches) > 0 then
        set w to item windowIndex of windows
        set tb to item tabIndex of tabs of w
        set s to item 1 of tabMatches
        select w
        select tb
        select s
        activate
        return tty of s
      end if
    end repeat
  end repeat
  return "miss"
end tell`;
}

export function buildGhosttyFocusScript(): string {
  return `tell application "Ghostty"
  ignoring case
    repeat with t in terminals
      if (name of t as text) is "herdr" then
        focus t
        return "focused"
      end if
    end repeat
  end ignoring
  return "miss"
end tell`;
}

export function selectWezTermPane(output: string, ttys: string[]): string | undefined {
  let panes: WezTermPane[];
  try {
    panes = JSON.parse(output) as WezTermPane[];
  } catch {
    return undefined;
  }
  const match = panes.find((pane) => pane.tty_name && ttys.includes(pane.tty_name));
  return match ? String(match.pane_id) : undefined;
}

export function selectWezTermWindow(output: string): string | undefined {
  let panes: WezTermPane[];
  try {
    panes = JSON.parse(output) as WezTermPane[];
  } catch {
    return undefined;
  }
  const windowId = panes.find((pane) => Number.isInteger(pane.window_id))?.window_id;
  return windowId === undefined ? undefined : String(windowId);
}
