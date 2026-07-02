import { LocalStorage } from "@raycast/api";

// Phase C2 — the watcher's cross-tick memory.
//
// The Python daemon is one long-running process: it holds last_logged_state,
// _last_event_count, and the auth-failure flag in RAM for its whole lifetime.
// A Raycast background command is a FRESH process every 60s, so that RAM is
// wiped each tick. Without persisting it, the watcher would re-log every event
// every minute and forget what it had already reported.
//
// This module is the daemon's "RAM that lives as long as the process" rebuilt
// as "LocalStorage that lives as long as the install". It has no daemon-file
// equivalent (processed_events.json is the real state; this is bookkeeping), so
// it lives in its own module rather than in state.ts.

const LOG_STATE_KEY = "watcher_log_state"; // <- last_logged_state
const SYS_STATE_KEY = "watcher_sys_state"; // <- one-shot system-message flags
const LAST_COUNT_KEY = "watcher_last_count"; // <- _last_event_count
const SELECTED_CALENDAR_KEY = "selected_calendar_id";
const WATCHER_LOCK_KEY = "watcher_lock"; // <- write-race guard (C4.a), ISO timestamp
const ACTIVE_SESSION_KEY = "active_session"; // <- skip-if-running model (C4.b)

// eventId -> "<action>|<startIso>", so a decision is logged only when it changes.
export type LogState = Record<string, string>;
// tag -> last message logged for that tag, so a persistent condition (no auth,
// no calendar, repeating error) logs once, not every 60s.
export type SysState = Record<string, string>;
// The session the watcher last modeled as "running" (C4.b skip-if-running). There
// is no Raycast API to ask whether Focus is running, so the guard tracks our own
// fire DECISIONS, not Focus processes: at each fire it records a window ending at
// fireTime + focusDurationSeconds. `endIso` is when that modeled window closes.
export type ActiveSession = { eventId: string; endIso: string };

async function loadJsonMap<T extends Record<string, string>>(
  key: string,
): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return {} as T;
  try {
    const data = JSON.parse(raw);
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      return data as T;
    }
    return {} as T;
  } catch {
    return {} as T;
  }
}

export function loadLogState(): Promise<LogState> {
  return loadJsonMap<LogState>(LOG_STATE_KEY);
}
export async function saveLogState(s: LogState): Promise<void> {
  await LocalStorage.setItem(LOG_STATE_KEY, JSON.stringify(s));
}

export function loadSysState(): Promise<SysState> {
  return loadJsonMap<SysState>(SYS_STATE_KEY);
}
export async function saveSysState(s: SysState): Promise<void> {
  await LocalStorage.setItem(SYS_STATE_KEY, JSON.stringify(s));
}

export async function loadLastCount(): Promise<number | null> {
  const raw = await LocalStorage.getItem<string>(LAST_COUNT_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}
export async function saveLastCount(n: number): Promise<void> {
  await LocalStorage.setItem(LAST_COUNT_KEY, String(n));
}

// The write-race guard (C4.a). A tick stamps watcher_lock with its start time at
// the top and clears it on exit; an overlapping tick that finds a fresh lock
// (younger than WATCHER_LOCK_STALE_SECONDS) bails. Stored as an ISO string so a
// crashed-tick's stale lock is human-readable in a LocalStorage dump.
//
// This is a mitigation, not a mutex: LocalStorage has no atomic get-and-set, so
// two ticks reading "no lock" in the same millisecond can both proceed. It
// shrinks the race window from the whole tick to ~ms; mark-before-fire (C4.b)
// bounds the worst case. See spec C4.a self-critique.
export async function loadWatcherLock(): Promise<Date | null> {
  const raw = await LocalStorage.getItem<string>(WATCHER_LOCK_KEY);
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : new Date(ms);
}
export async function setWatcherLock(at: Date): Promise<void> {
  await LocalStorage.setItem(WATCHER_LOCK_KEY, at.toISOString());
}
export async function clearWatcherLock(): Promise<void> {
  await LocalStorage.removeItem(WATCHER_LOCK_KEY);
}

// The skip-if-running modeled session (C4.b). Written at every fire decision
// (including dry-run), read at the next fire decision: if `now` is still inside
// the modeled window, the watcher logs SKIPPED_FOCUS_RUNNING and does not fire.
// Both the watcher and the Phase D dry daemon record at the same moment with the
// same window math, so the skip lines line up by construction. No setter
// `clear` yet: a session retires by its window passing; the modal clears it on
// Skip/timeout only at Phase E (the modal is frozen through the dual-run).
export async function loadActiveSession(): Promise<ActiveSession | null> {
  const raw = await LocalStorage.getItem<string>(ACTIVE_SESSION_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (
      typeof data === "object" &&
      data !== null &&
      typeof data.eventId === "string" &&
      typeof data.endIso === "string"
    ) {
      return data as ActiveSession;
    }
    return null;
  } catch {
    return null;
  }
}
export async function saveActiveSession(s: ActiveSession): Promise<void> {
  await LocalStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(s));
}

export async function getSelectedCalendarId(): Promise<string | null> {
  const raw = await LocalStorage.getItem<string>(SELECTED_CALENDAR_KEY);
  return raw && raw.length > 0 ? raw : null;
}
export async function setSelectedCalendarId(id: string): Promise<void> {
  await LocalStorage.setItem(SELECTED_CALENDAR_KEY, id);
}
// Removes the stored calendar id, returning the watcher to "Waiting for
// onboarding". Used by the D.5 dev-only reset (Raycast's Log Out clears the
// token but not this key) and as the durable state-reset on rollback.
export async function clearSelectedCalendarId(): Promise<void> {
  await LocalStorage.removeItem(SELECTED_CALENDAR_KEY);
}
