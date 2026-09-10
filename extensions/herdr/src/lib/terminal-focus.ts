import { basename } from "node:path";

interface WezTermPane {
  window_id?: number;
  pane_id: number;
  tty_name?: string;
}

function appleScriptString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n")}"`;
}

export interface HerdrClient {
  pid: string;
  tty: string;
}

function isHerdrCommand(args: string, binaryName: string): boolean {
  const executable = args
    .trim()
    .split(/\s+/, 1)[0]
    .replace(/^['"]|['"]$/g, "");
  return basename(executable) === binaryName || basename(executable) === "herdr";
}

function sessionMatches(args: string, sessionName?: string): boolean {
  const namedSession = args.match(/(?:^|\s)--session(?:=|\s+)([^\s]+)/)?.[1];
  const attachedSession = args.match(/(?:^|\s)session\s+attach\s+([^\s]+)/)?.[1];
  // A bare client reads as default. Argv cannot reveal a client that joined a
  // named session through an inherited HERDR_SESSION.
  const clientSession = namedSession || attachedSession || "default";
  return clientSession === (sessionName?.trim() || "default");
}

export function parseHerdrClientTtys(output: string, binary: string, sessionName?: string): string[] {
  const binaryName = basename(binary);
  const ttys: string[] = [];
  for (const line of output.split("\n")) {
    const match = line.trim().match(/^(\S+)\s+(\S+)\s+(.+)$/);
    if (!match) continue;
    const [, tty, , args] = match;
    if (tty === "??" || tty === "?") continue;
    if (!isHerdrCommand(args, binaryName)) continue;
    if (!sessionMatches(args, sessionName)) continue;
    ttys.push(tty.startsWith("/dev/") ? tty : `/dev/${tty}`);
  }
  return [...new Set(ttys)];
}

// Only an argv that names the session outright qualifies a detach candidate:
// a bare `herdr` or the remote bridge's `herdr client` would otherwise read as
// a Default Session client, and a `--remote` attach targets another host.
function namedSession(args: string): string | undefined {
  if (/(?:^|\s)--remote(?:=|\s)/.test(args)) return undefined;
  return (
    args.match(/(?:^|\s)--session(?:=|\s+)([^\s]+)/)?.[1] ?? args.match(/(?:^|\s)session\s+attach\s+([^\s]+)/)?.[1]
  );
}

/** Parses `ps -o pid=,tty=,comm=,args=` into the Clients that name `sessionName`. */
export function parseHerdrClients(output: string, binary: string, sessionName: string): HerdrClient[] {
  const binaryName = basename(binary);
  const clients: HerdrClient[] = [];
  for (const line of output.split("\n")) {
    const match = line.trim().match(/^(\d+)\s+(\S+)\s+(\S+)\s+(.+)$/);
    if (!match) continue;
    const [, pid, tty, , args] = match;
    if (tty === "??" || tty === "?") continue;
    if (!isHerdrCommand(args, binaryName)) continue;
    if (namedSession(args) !== sessionName) continue;
    clients.push({ pid, tty: tty.startsWith("/dev/") ? tty : `/dev/${tty}` });
  }
  return clients;
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

export function buildGhosttyFocusScript(title: string): string {
  const targetTitle = appleScriptString(title);
  return `tell application "Ghostty"
  ignoring case
    repeat 5 times
      repeat with t in terminals
        if (name of t as text) is ${targetTitle} then
          focus t
          return "focused"
        end if
      end repeat
      delay 0.02
    end repeat
  end ignoring
  return "miss"
end tell`;
}

export function buildTerminalTtyListScript(): string {
  return `tell application "Terminal" to get tty of every tab of every window`;
}

export function buildITermTtyListScript(): string {
  return `tell application "iTerm" to get tty of every session of every tab of every window`;
}

/** osascript prints nested lists flattened as "/dev/ttys001, /dev/ttys002". */
export function parseTtyList(output: string): string[] {
  return [...new Set(output.split(/[,\s]+/).filter((item) => item.startsWith("/dev/")))];
}

/** The given ttys that are WezTerm panes, with the window of the first match. */
export function selectWezTermPanes(output: string, ttys: string[]): { ttys: string[]; windowId?: string } | undefined {
  let panes: unknown;
  try {
    panes = JSON.parse(output);
  } catch {
    return undefined;
  }
  if (!Array.isArray(panes)) return undefined;
  const matches = (panes as WezTermPane[]).filter((pane) => pane.tty_name && ttys.includes(pane.tty_name));
  const windowId = matches.find((pane) => Number.isInteger(pane.window_id))?.window_id;
  return {
    ttys: matches.map((pane) => pane.tty_name as string),
    windowId: windowId === undefined ? undefined : String(windowId),
  };
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
