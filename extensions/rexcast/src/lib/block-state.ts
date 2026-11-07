// What a terminal pane is doing, from the data Rex already has:
//  1. the status programs report themselves (OSC 7501: idle, working, done, blocked, error), and
//  2. for programs that report nothing, which process is in the foreground.
// Pure functions: no Raycast or Rex calls, so they are easy to test.

export type State = "idle" | "working" | "done" | "blocked" | "error";
export type Status = "blocked" | "failed" | "working" | "finished" | "idle";
export type Event = "blocked" | "finished" | "failed";

export type Reading = { state: State; kind?: string; detail?: string; updatedAt?: string };
export type Stored = { state: State; updatedAt?: string; unseen: boolean };

type Proc = { pid: number; name?: string; argv0?: string };
export type ProcessInfo = {
  last_exit?: { exit_code: number } | null;
  child?: Proc | null;
  foreground?: Proc | null;
};
export type StatusRecord = {
  state?: string;
  kind?: string;
  app?: string;
  title?: string;
  msg?: string;
  updated_at?: string;
};

const SHELLS = new Set(["zsh", "bash", "fish", "sh", "dash", "ksh", "tcsh", "nu", "login"]);
const RANK: Record<State, number> = { blocked: 4, error: 3, working: 2, done: 1, idle: 0 };
const STATUS_RANK: Record<Status, number> = { blocked: 4, failed: 3, working: 2, finished: 1, idle: 0 };

const procName = (p?: Proc | null) => p?.argv0 || p?.name;

export function readBlock(proc: ProcessInfo | null, records: StatusRecord[] = []): Reading {
  // Only states we know. A program that says "idle" is trusted: it is waiting for you, even though it
  // stays in the foreground. The process is only a fallback for programs that report nothing.
  const best = records
    .filter((r) => r.state && r.state in RANK)
    .map((r) => ({ r, state: r.state as State }))
    .sort((a, b) => RANK[b.state] - RANK[a.state])[0];
  if (best) {
    const { r, state } = best;
    return { state, kind: r.kind, detail: r.msg || r.title || r.app, updatedAt: r.updated_at };
  }

  if (proc?.last_exit) {
    const code = proc.last_exit.exit_code;
    return { state: code === 0 ? "done" : "error", detail: `exit ${code}` };
  }
  const fg = proc?.foreground;
  // The pane's own program is still alive (e.g. a `sh -c …` pane), or a command runs under the shell.
  if (fg && (fg.pid === proc?.child?.pid || !SHELLS.has(fg.name ?? ""))) {
    return { state: "working", detail: procName(fg) };
  }
  return { state: "idle" };
}

/** Compares with the last reading and says what just happened, if anything. */
export function step(prev: Stored | undefined, cur: Reading): { stored: Stored; event?: Event } {
  const refreshed = prev?.updatedAt !== cur.updatedAt;
  let event: Event | undefined;
  if (prev) {
    if (cur.state === "blocked" && (prev.state !== "blocked" || refreshed)) event = "blocked";
    else if (cur.state === "error" && (prev.state !== "error" || refreshed)) event = "failed";
    else if (cur.state === "done" && (prev.state !== "done" || refreshed)) event = "finished";
    else if (cur.state === "idle" && prev.state === "working") event = "finished";
  }
  const unseen =
    cur.state === "working" || cur.state === "blocked" ? false : event ? event !== "blocked" : !!prev?.unseen;
  return { stored: { state: cur.state, updatedAt: cur.updatedAt, unseen }, event };
}

export function statusOf(s: Stored): Status {
  if (s.state === "blocked") return "blocked";
  if (s.state === "working") return "working";
  if (s.state === "error" && s.unseen) return "failed";
  if (s.unseen) return "finished";
  return "idle";
}

/** The most important status among a session's panes. */
export const aggregate = (statuses: Status[]): Status =>
  statuses.reduce<Status>((a, b) => (STATUS_RANK[b] > STATUS_RANK[a] ? b : a), "idle");
