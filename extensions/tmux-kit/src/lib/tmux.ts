import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { getPreferenceValues } from "@raycast/api";

const execFileP = promisify(execFile);

type Preferences = { tmuxBinary?: string };

export function tmuxBin(): string {
  const p = getPreferenceValues<Preferences>().tmuxBinary?.trim();
  return p && p.length > 0 ? p : "/opt/homebrew/bin/tmux";
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
      };
    });
}

export async function killPane(paneId: string): Promise<void> {
  await run(["kill-pane", "-t", paneId]);
}

// ── Resurrect ──────────────────────────────────────────────────────────────

const RESURRECT_DIR = `${homedir()}/.tmux/plugins/tmux-resurrect/scripts`;

export async function resurrectSave(): Promise<void> {
  await run(["run-shell", `${RESURRECT_DIR}/save.sh`]);
}

export async function resurrectRestore(): Promise<void> {
  await run(["run-shell", `${RESURRECT_DIR}/restore.sh`]);
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
