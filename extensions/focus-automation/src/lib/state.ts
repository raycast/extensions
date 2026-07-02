import { LocalStorage } from "@raycast/api";
import { STATE_PRUNE_AGE_HOURS } from "./constants";
import { logSystem } from "./logger";

// Phase C2 — persistent processed-event state.
//
// LocalStorage port of the daemon's service/src/state.py. Same JSON shape as the
// daemon's processed_events.json so the Phase D dual-run can compare without
// re-mapping. One LocalStorage key, JSON-encoded.
//
//   { "<event_id>": { action, start_iso, processed_at } }
//
// Entries older than STATE_PRUNE_AGE_HOURS (by start_iso) are pruned on load.
// The only writer (markProcessed) is called from the trigger path in C4, not C2.

const STATE_KEY = "processed_events";

export type ProcessedEntry = {
  action: string;
  start_iso: string;
  processed_at: string;
};

export type ProcessedState = Record<string, ProcessedEntry>;

// Reads state, prunes stale entries, returns a map keyed by event_id.
// Missing key -> {} (silent, expected before anything is processed).
// Corrupt / wrong-shape value -> {} + a warning line (mirrors state.py.load).
export async function load(): Promise<ProcessedState> {
  const raw = await LocalStorage.getItem<string>(STATE_KEY);
  if (!raw) return {};

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    logSystem(
      `[state] Could not parse processed_events (${e}). Starting with empty state.`,
    );
    return {};
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    logSystem(
      "[state] processed_events has unexpected shape. Starting with empty state.",
    );
    return {};
  }

  // Prune by start_iso against a 24h cutoff. new Date(iso) honors the timezone
  // offset, so this matches the daemon's UTC-aware comparison.
  const cutoff = Date.now() - STATE_PRUNE_AGE_HOURS * 60 * 60 * 1000;
  const pruned: ProcessedState = {};
  for (const [eventId, entry] of Object.entries(
    data as Record<string, ProcessedEntry>,
  )) {
    const startMs = entry?.start_iso
      ? new Date(entry.start_iso).getTime()
      : NaN;
    if (!Number.isNaN(startMs) && startMs >= cutoff) {
      pruned[eventId] = entry;
    }
  }
  return pruned;
}

// Persists state. LocalStorage handles the atomic write; failure is logged, not
// thrown, so the watcher keeps running (mirrors state.py.save).
export async function save(state: ProcessedState): Promise<void> {
  try {
    await LocalStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) {
    logSystem(`[state] Could not write processed_events: ${e}`);
  }
}

// Records an event as processed and persists. Mutates `state` in place.
// Built in C2 for parity; the only caller is the trigger fire path, wired in C4.
export async function markProcessed(
  state: ProcessedState,
  eventId: string,
  action: string,
  start: Date,
): Promise<void> {
  state[eventId] = {
    action,
    start_iso: start.toISOString(),
    processed_at: new Date().toISOString(),
  };
  await save(state);
}
