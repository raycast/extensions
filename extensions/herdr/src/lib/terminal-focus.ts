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

/**
 * The one column set both lookups ask `ps` for. `comm` is omitted because macOS
 * truncates it to 16 characters, which splits a binary path containing a space.
 */
export const PS_COLUMNS = "pid=,tty=,args=";

interface HerdrProcess extends HerdrClient {
  /** The argv after the executable, so a path containing spaces cannot shift the arguments. */
  arguments: string;
}

/** Parses `ps -o pid=,tty=,args=` into the Herdr processes that own a tty. */
function parseHerdrProcesses(output: string, binary: string): HerdrProcess[] {
  const binaryName = basename(binary);
  const processes: HerdrProcess[] = [];
  for (const line of output.split("\n")) {
    const match = line.trim().match(/^(\d+)\s+(\S+)\s+(.+)$/);
    if (!match) continue;
    const [, pid, tty, args] = match;
    if (tty === "??" || tty === "?") continue;
    const argv = args.trim().replace(/^['"]|['"]$/g, "");
    // The resolved binary path is matched whole, so a path containing spaces
    // still yields the right argument list; a differently located `herdr`
    // falls back to the first token.
    const first = argv.split(/\s+/)[0];
    let rest: string;
    if (argv === binary || argv.startsWith(`${binary} `)) rest = argv.slice(binary.length);
    else if (basename(first) === binaryName || basename(first) === "herdr") rest = argv.slice(first.length);
    else continue;
    processes.push({ pid, tty: tty.startsWith("/dev/") ? tty : `/dev/${tty}`, arguments: rest.trim() });
  }
  return processes;
}

type ArgvSession =
  /** `herdr --session x` or `herdr session attach x`. */
  | { kind: "named"; session: string }
  /** A plain `herdr`, which joins the Default Session. */
  | { kind: "bare" }
  /** Not a local Client: a server, a CLI call, the remote bridge, or a remote attach. */
  | { kind: "other" };

/**
 * What a Herdr process's arguments say about the Session it belongs to. The
 * remote bridge (`herdr client`) and a `--remote` attach drive another host's
 * server, so neither is ever a Client of a local Session.
 */
function argvSession(argv: string): ArgvSession {
  if (argv === "") return { kind: "bare" };
  if (/(?:^|\s)--remote(?:=|\s)/.test(argv)) return { kind: "other" };
  const session =
    argv.match(/(?:^|\s)--session(?:=|\s+)([^\s]+)/)?.[1] ?? argv.match(/^session\s+attach\s+([^\s]+)/)?.[1];
  return session === undefined ? { kind: "other" } : { kind: "named", session };
}

/**
 * Ttys of Clients that may be Revealed. A plain `herdr` reads as the Default
 * Session, because argv cannot reveal a client that joined a named session
 * through an inherited HERDR_SESSION.
 */
export function parseHerdrClientTtys(output: string, binary: string, sessionName?: string): string[] {
  const wanted = sessionName?.trim() || "default";
  const ttys = parseHerdrProcesses(output, binary)
    .filter((process) => {
      const argv = argvSession(process.arguments);
      return argv.kind === "named" ? argv.session === wanted : argv.kind === "bare" && wanted === "default";
    })
    .map((process) => process.tty);
  return [...new Set(ttys)];
}

/**
 * Clients whose arguments name `sessionName` outright, as pid and tty pairs.
 * Argv alone never qualifies one for a detach; the caller must also find its
 * tty in the Terminal Application's pane listing.
 */
export function parseHerdrClients(output: string, binary: string, sessionName: string): HerdrClient[] {
  return parseHerdrProcesses(output, binary)
    .filter((process) => {
      const argv = argvSession(process.arguments);
      return argv.kind === "named" && argv.session === sessionName;
    })
    .map(({ pid, tty }) => ({ pid, tty }));
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
export function parseWezTermPanes(output: string): WezTermPane[] | undefined {
  let panes: unknown;
  try {
    panes = JSON.parse(output);
  } catch {
    return undefined;
  }
  return Array.isArray(panes) ? (panes as WezTermPane[]) : undefined;
}

/** The given ttys that are WezTerm panes, with the window of the first match. */
export function selectWezTermPanes(output: string, ttys: string[]): { ttys: string[]; windowId?: string } | undefined {
  const panes = parseWezTermPanes(output);
  if (!panes) return undefined;
  const matches = panes.filter((pane) => pane.tty_name && ttys.includes(pane.tty_name));
  const windowId = matches.find((pane) => Number.isInteger(pane.window_id))?.window_id;
  return {
    ttys: matches.map((pane) => pane.tty_name as string),
    windowId: windowId === undefined ? undefined : String(windowId),
  };
}

export function selectWezTermPane(output: string, ttys: string[]): string | undefined {
  const match = parseWezTermPanes(output)?.find((pane) => pane.tty_name && ttys.includes(pane.tty_name));
  return match ? String(match.pane_id) : undefined;
}

export function selectWezTermWindow(output: string): string | undefined {
  const windowId = parseWezTermPanes(output)?.find((pane) => Number.isInteger(pane.window_id))?.window_id;
  return windowId === undefined ? undefined : String(windowId);
}
