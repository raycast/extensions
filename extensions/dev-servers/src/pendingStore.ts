import { LocalStorage } from "@raycast/api";

const PENDING_KEY = "pending-starts";

// Spawn failures worth naming on a failed row. Both read as "the extension
// broke" while the real cause, and the fix, sit outside the extension
// entirely, so the generic "check the startup log" wastes the user's time on a
// question we can already answer.
export type SpawnFailure = "port-conflict" | "portless-proxy-down";

// A start the dashboard has fired but not yet seen bind a port, keyed by cwd
// in `pendingStarts`. It renders as a synthetic list row (see PendingItem)
// until the real server row takes over, or until the watchdog gives up on it.
//
// Persisted rather than held in the view's state alone: Raycast unloads a view
// command as soon as the user leaves it, and a start typically fails after
// that. Without the store, the mount that fired the start is also the only one
// that could have diagnosed it, and reopening the dashboard showed no trace of
// the attempt at all.
export type PendingStart = {
  // Project display name, from the spawn target.
  name: string;
  // Which section the row belongs to. Taken from a running server for this
  // cwd when there is one, so a restart lands among its siblings; otherwise
  // the cwd stands in, which is what projectKey falls back to for a
  // non-git project anyway.
  projectKey: string;
  // Spawn-log byte offset at spawn time, copied from the phase's `expecting`
  // map so a failed row can diagnose itself from this attempt's bytes alone.
  logStart: number;
  // The moment the watchdog gives up on this row, epoch ms. Carried on the row
  // itself, rather than living only in the timer the starting mount armed, so
  // a later mount can tell a start still inside its window from one that ran
  // out while nobody was watching, and finish the job either way.
  deadline: number;
  status: "starting" | "failed";
  // Set when failed and diagnosable, else null.
  reason: SpawnFailure | null;
  // What the row says while it waits, and how long a failure claims it gave
  // the server (the spawn watchdog allows 15s, restart's own poll ~10s).
  kind: "start" | "restart";
  // Every pid listed for this cwd when the row was made, plus the pid a
  // restart is replacing. The row resolves only when some *other* server
  // appears for the cwd.
  //
  // Without this the row could resolve against something that was already
  // there: a sibling, when a project runs two servers from one folder, or the
  // corpse of the server being replaced, which lingers in `servers` until the
  // next poll clears it. Either one retires the row the instant it goes up,
  // making a start that never binds a port look like a success.
  //
  // A genuinely cold start has nothing holding its cwd, so this is empty and
  // the test reduces to "a server on a deliberate port for this cwd".
  ignorePids: readonly number[];
};

// Stored as [cwd, entry] pairs under one key: a Map is what every caller
// works in, and one key keeps a write atomic against a reader that would
// otherwise catch the rows half-updated.
function isPendingStart(value: unknown): value is PendingStart {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as PendingStart;
  return (
    typeof entry.name === "string" &&
    typeof entry.projectKey === "string" &&
    typeof entry.logStart === "number" &&
    typeof entry.deadline === "number" &&
    (entry.status === "starting" || entry.status === "failed") &&
    (entry.kind === "start" || entry.kind === "restart") &&
    Array.isArray(entry.ignorePids)
  );
}

export async function readPendingStarts(): Promise<Map<string, PendingStart>> {
  const raw = await LocalStorage.getItem<string>(PENDING_KEY);
  if (!raw) return new Map();
  try {
    const pairs: unknown = JSON.parse(raw);
    if (!Array.isArray(pairs)) return new Map();
    return new Map(
      pairs.filter(
        (pair): pair is [string, PendingStart] =>
          Array.isArray(pair) &&
          pair.length === 2 &&
          typeof pair[0] === "string" &&
          isPendingStart(pair[1]),
      ),
    );
  } catch {
    // Pending rows are a diagnosis aid, never the source of truth for what is
    // running, so unreadable storage costs the user a row and nothing more.
    return new Map();
  }
}

export async function writePendingStarts(
  pending: Map<string, PendingStart>,
): Promise<void> {
  await LocalStorage.setItem(PENDING_KEY, JSON.stringify([...pending]));
}
