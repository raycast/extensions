import { LocalStorage } from "@raycast/api";
import { STATE_PRUNE_AGE_HOURS } from "./constants";
import { logSystem } from "./logger";

const STATE_KEY = "processed_events";

export type ProcessedEntry = {
  action: string;
  start_iso: string;
  processed_at: string;
};

export type ProcessedState = Record<string, ProcessedEntry>;

export async function load(): Promise<ProcessedState> {
  const raw = await LocalStorage.getItem<string>(STATE_KEY);
  if (!raw) return {};

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    logSystem(`[state] Could not parse processed_events (${e}). Starting with empty state.`);
    return {};
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    logSystem("[state] processed_events has unexpected shape. Starting with empty state.");
    return {};
  }

  const cutoff = Date.now() - STATE_PRUNE_AGE_HOURS * 60 * 60 * 1000;
  const pruned: ProcessedState = {};
  for (const [eventId, entry] of Object.entries(data as Record<string, ProcessedEntry>)) {
    const startMs = entry?.start_iso ? new Date(entry.start_iso).getTime() : NaN;
    if (!Number.isNaN(startMs) && startMs >= cutoff) {
      pruned[eventId] = entry;
    }
  }
  return pruned;
}

export async function save(state: ProcessedState): Promise<void> {
  try {
    await LocalStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) {
    logSystem(`[state] Could not write processed_events: ${e}`);
  }
}

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
