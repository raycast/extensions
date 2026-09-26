import { ProcessInfo } from "../types";

// loginwindow runs as the user, but killing it ends the whole session.
const PROTECTED = new Set(["launchd", "WindowServer", "kernel_task", "loginwindow"]);

export function canTerminate(
  p: { pid: number; command: string },
  info: ProcessInfo | undefined,
  currentUser: string,
): boolean {
  // Never the process this extension runs in, nor Raycast's process that hosts it.
  const self = p.pid === process.pid || p.pid === process.ppid;
  return p.pid > 1 && !self && !PROTECTED.has(p.command) && info !== undefined && info.user === currentUser;
}

export type ProcessKind = "app" | "command-line tool";

/** An app bundle or a command-line tool, by the executable's path. */
export function processKind(info: ProcessInfo): ProcessKind {
  return info.path.includes(".app/") ? "app" : "command-line tool";
}

export type Starter = { pid: number; command: string; kind: ProcessKind };

/**
 * The process that started a sleep blocker, when the user may terminate it under the usual rules.
 * Its kind lets the confirm dialog say plainly that a command-line starter (e.g. claude in a
 * terminal) ends a terminal session, not just an app.
 */
export function starterTarget(
  origin: { pid: number; command: string; terminal?: true } | undefined,
  info: ProcessInfo | undefined,
  currentUser: string,
): Starter | undefined {
  // A command typed in a terminal: terminating the terminal would close every session in it.
  if (!origin || origin.terminal || !info || !canTerminate(origin, info, currentUser)) return undefined;
  return { pid: origin.pid, command: origin.command, kind: processKind(info) };
}

// ps reports elapsed time in whole seconds, and the two readings are taken a moment apart.
const START_TOLERANCE_MS = 5000;

/**
 * Whether the process on a pid is still the one the list showed: same name, same start time. The
 * list can be 15 s old, plus however long a confirmation stays open, and pids are reused.
 */
export function sameProcess(
  seen: { command: string; etimeSec: number },
  seenAt: number,
  now: { command: string; etimeSec: number } | undefined,
  nowAt: number,
): boolean {
  if (!now || now.command !== seen.command) return false;
  const startedSeen = seenAt - seen.etimeSec * 1000;
  const startedNow = nowAt - now.etimeSec * 1000;
  return Math.abs(startedSeen - startedNow) <= START_TOLERANCE_MS;
}

export type TerminateResult = "exited" | "still-running" | "not-found" | "permission-denied";

type Deps = {
  kill: (pid: number, signal: NodeJS.Signals | 0) => void;
  sleep: (ms: number) => Promise<void>;
};

const defaultDeps: Deps = {
  kill: (pid, signal) => {
    process.kill(pid, signal);
  },
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

function code(e: unknown): string | undefined {
  return typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : undefined;
}

/** Sends the signal, then polls up to 2 s to verify the process is really gone. */
export async function terminate(
  pid: number,
  signal: "SIGTERM" | "SIGKILL",
  deps: Deps = defaultDeps,
): Promise<TerminateResult> {
  try {
    deps.kill(pid, signal);
  } catch (e) {
    return code(e) === "EPERM" ? "permission-denied" : "not-found";
  }
  for (let i = 0; i < 10; i++) {
    try {
      deps.kill(pid, 0);
    } catch (e) {
      // EPERM: the pid now belongs to another user's process, so ours is gone.
      if (code(e) === "ESRCH" || code(e) === "EPERM") return "exited";
    }
    await deps.sleep(200);
  }
  return "still-running";
}
