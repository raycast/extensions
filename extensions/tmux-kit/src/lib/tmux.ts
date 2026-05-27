import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { getPreferenceValues } from "@raycast/api";

const execFileP = promisify(execFile);

export function tmuxBin(): string {
  const p = getPreferenceValues<Preferences>().tmuxBinary.trim();
  return p.length > 0 ? p : "/opt/homebrew/bin/tmux";
}

export class TmuxError extends Error {
  constructor(
    message: string,
    public readonly code: number | null,
    public readonly stderr: string,
  ) {
    super(message);
    this.name = "TmuxError";
  }
}

async function run(
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileP(tmuxBin(), args, { encoding: "utf8" });
  } catch (e) {
    const err = e as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
      code?: number;
    };
    throw new TmuxError(err.message, err.code ?? null, err.stderr ?? "");
  }
}

export type TmuxSession = {
  name: string;
  windows: number;
  attached: boolean;
  created: Date;
  activity: Date;
  currentWindow: string;
  currentPath: string;
};

// Use a printable multi-character delimiter. Tab characters get
// normalized to "_" somewhere between our execFile call and tmux's
// stdout when running inside Raycast's runtime, and single-byte
// control characters (\x01) appear to suffer the same fate. Picking
// a sequence that cannot occur in session names, paths, or window
// names sidesteps both problems entirely.
const FIELD_SEP = "||SEP||";

const SESSION_FORMAT = [
  "#{session_name}",
  "#{session_windows}",
  "#{session_attached}",
  "#{session_created}",
  "#{session_activity}",
  "#{session_current_window_name}",
  "#{session_current_path}",
].join(FIELD_SEP);

export async function listSessions(): Promise<TmuxSession[]> {
  try {
    const { stdout } = await run(["list-sessions", "-F", SESSION_FORMAT]);
    return stdout
      .split("\n")
      .filter((l) => l.length > 0)
      .map((line) => {
        const [
          name,
          windows,
          attached,
          created,
          activity,
          currentWindow,
          currentPath,
        ] = line.split(FIELD_SEP);
        return {
          name,
          windows: Number(windows),
          attached: Number(attached) > 0,
          created: new Date(Number(created) * 1000),
          activity: new Date(Number(activity) * 1000),
          currentWindow: currentWindow ?? "",
          currentPath: currentPath ?? "",
        };
      });
  } catch (e) {
    if (e instanceof TmuxError && /no server running/i.test(e.stderr)) {
      return [];
    }
    throw e;
  }
}

export async function killSession(name: string): Promise<void> {
  await run(["kill-session", "-t", name]);
}

export async function killOtherSessions(keep: string): Promise<void> {
  await run(["kill-session", "-a", "-t", keep]);
}

export async function renameSession(
  oldName: string,
  newName: string,
): Promise<void> {
  await run(["rename-session", "-t", oldName, newName]);
}

export async function switchClient(target: string): Promise<void> {
  await run(["switch-client", "-t", target]);
}

export async function newSession(
  name: string,
  startDir?: string,
): Promise<void> {
  const args = ["new-session", "-d", "-s", name];
  if (startDir) args.push("-c", startDir);
  await run(args);
}

export async function hasAnyClient(): Promise<boolean> {
  try {
    const { stdout } = await run(["list-clients", "-F", "#{client_name}"]);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

export function attachCommand(session: string): string {
  return `tmux attach -t ${shellQuote(session)}`;
}

function shellQuote(s: string): string {
  if (/^[A-Za-z0-9._\-/:=]+$/.test(s)) return s;
  return `'${s.replace(/'/g, "'\\''")}'`;
}

// ── Panes ──────────────────────────────────────────────────────────────────

export type TmuxPane = {
  id: string;
  index: number;
  windowIndex: number;
  windowName: string;
  command: string;
  path: string;
  pid: number;
  active: boolean;
  width: number;
  height: number;
  marked: boolean;
  // Session ID (e.g. "$3"). Use this rather than session name when building
  // window-level tmux targets, because session names may legally contain ":"
  // and would collide with the "session:window" target syntax.
  sessionId: string;
};

const PANE_FORMAT = [
  "#{pane_id}",
  "#{pane_index}",
  "#{window_index}",
  "#{window_name}",
  "#{pane_current_command}",
  "#{pane_current_path}",
  "#{pane_pid}",
  "#{pane_active}",
  "#{pane_width}",
  "#{pane_height}",
  "#{pane_marked}",
  "#{session_id}",
].join(FIELD_SEP);

export async function listPanes(session: string): Promise<TmuxPane[]> {
  const { stdout } = await run([
    "list-panes",
    "-t",
    session,
    "-s",
    "-F",
    PANE_FORMAT,
  ]);
  return stdout
    .split("\n")
    .filter((l) => l.length > 0)
    .map((line) => {
      const p = line.split(FIELD_SEP);
      return {
        id: p[0],
        index: Number(p[1]),
        windowIndex: Number(p[2]),
        windowName: p[3] ?? "",
        command: p[4] ?? "",
        path: p[5] ?? "",
        pid: Number(p[6]),
        active: Number(p[7]) > 0,
        width: Number(p[8]),
        height: Number(p[9]),
        marked: Number(p[10]) > 0,
        sessionId: p[11] ?? "",
      };
    });
}

export async function killPane(paneId: string): Promise<void> {
  await run(["kill-pane", "-t", paneId]);
}

export async function killOtherPanes(paneId: string): Promise<void> {
  await run(["kill-pane", "-a", "-t", paneId]);
}

// Capture visible pane contents. -J joins wrapped lines for cleaner output.
// The visible screen is padded with empty rows up to pane height, so we trim
// trailing whitespace to avoid a wall of blank lines in clipboard / Detail.
export async function capturePane(paneId: string): Promise<string> {
  const { stdout } = await run(["capture-pane", "-p", "-J", "-t", paneId]);
  return stdout.replace(/\s+$/, "");
}

export async function breakPane(paneId: string): Promise<void> {
  await run(["break-pane", "-s", paneId]);
}

export async function markPane(paneId: string): Promise<void> {
  await run(["select-pane", "-m", "-t", paneId]);
}

// `select-pane -M` clears the marked pane globally (no -t needed).
export async function clearMarkedPane(): Promise<void> {
  await run(["select-pane", "-M"]);
}

// `swap-pane -t <id>` with no -s uses the currently marked pane as source.
// Caller must verify a marked pane exists before invoking.
export async function swapWithMarkedPane(paneId: string): Promise<void> {
  await run(["swap-pane", "-t", paneId]);
}

export async function clearPaneHistory(paneId: string): Promise<void> {
  await run(["clear-history", "-t", paneId]);
}

// ── Windows ────────────────────────────────────────────────────────────────

// Window-level operations build targets as `${sessionId}:${windowIndex}`.
// We use session_id (e.g. "$3"), not session name, because session names
// may legally contain ":" and would make the target ambiguous (tmux would
// parse "my:session:0" as window "session:0" inside session "my").

export async function switchToWindow(
  sessionId: string,
  windowIndex: number,
): Promise<void> {
  await run(["select-window", "-t", `${sessionId}:${windowIndex}`]);
}

export async function renameWindow(
  sessionId: string,
  windowIndex: number,
  newName: string,
): Promise<void> {
  await run(["rename-window", "-t", `${sessionId}:${windowIndex}`, newName]);
}

export async function killWindow(
  sessionId: string,
  windowIndex: number,
): Promise<void> {
  await run(["kill-window", "-t", `${sessionId}:${windowIndex}`]);
}

// Create a new window in the given session. -d keeps the session's current
// window unchanged so we don't yank tmux focus out from under any attached
// client; the user can Switch afterwards if they want to land on it.
export async function newWindow(
  sessionId: string,
  name?: string,
  cwd?: string,
): Promise<void> {
  const args = ["new-window", "-d", "-t", `${sessionId}:`];
  if (name) args.push("-n", name);
  if (cwd) args.push("-c", cwd);
  await run(args);
}

// ── Resurrect ──────────────────────────────────────────────────────────────

const DEFAULT_RESURRECT_DIR = `${homedir()}/.tmux/plugins/tmux-resurrect/scripts`;

function resurrectDir(): string {
  const raw =
    getPreferenceValues<Preferences>().resurrectScriptsDir?.trim() ?? "";
  if (raw.length === 0) return DEFAULT_RESURRECT_DIR;
  // Expand leading ~ ourselves: the resolved path will be shell-quoted before
  // `tmux run-shell` so the shell will treat any ~ inside the quoted literal
  // as a normal character and the path would never resolve.
  if (raw === "~") return homedir();
  if (raw.startsWith("~/")) return `${homedir()}${raw.slice(1)}`;
  return raw;
}

// `tmux run-shell` executes its argument via /bin/sh, so we must shell-quote
// the path before joining it with the script filename — paths containing
// spaces (or any character outside [A-Za-z0-9._\-/:=]) would otherwise be
// word-split by the shell and fail.
export async function resurrectSave(): Promise<void> {
  await run(["run-shell", shellQuote(`${resurrectDir()}/save.sh`)]);
}

export async function resurrectRestore(): Promise<void> {
  await run(["run-shell", shellQuote(`${resurrectDir()}/restore.sh`)]);
}

// ── Arbitrary command via shell (for command palette) ─────────────────────

/**
 * Runs `tmux <input>` via /bin/sh -c, so the user's quoting and flags
 * are parsed exactly as in `prefix :` or a real tmux CLI invocation.
 * Returns stdout/stderr; throws TmuxError on non-zero exit (also returns
 * captured stderr inside the error).
 */
export async function runRawCommand(
  input: string,
): Promise<{ stdout: string; stderr: string }> {
  const cmd = `${shellQuote(tmuxBin())} ${input}`;
  try {
    return await execFileP("/bin/sh", ["-c", cmd], { encoding: "utf8" });
  } catch (e) {
    const err = e as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
      code?: number;
    };
    throw new TmuxError(err.message, err.code ?? null, err.stderr ?? "");
  }
}
