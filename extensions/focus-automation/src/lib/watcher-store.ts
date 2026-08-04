import { LocalStorage } from "@raycast/api";

const LOG_STATE_KEY = "watcher_log_state";
const SYS_STATE_KEY = "watcher_sys_state";
const LAST_COUNT_KEY = "watcher_last_count";
const SELECTED_CALENDAR_KEY = "selected_calendar_id";
const WATCHER_LOCK_KEY = "watcher_lock";
const ACTIVE_SESSION_KEY = "active_session";

export type LogState = Record<string, string>;
export type SysState = Record<string, string>;
export type ActiveSession = { eventId: string; endIso: string };

async function loadJsonMap<T extends Record<string, string>>(key: string): Promise<T> {
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
export async function clearSelectedCalendarId(): Promise<void> {
  await LocalStorage.removeItem(SELECTED_CALENDAR_KEY);
}
