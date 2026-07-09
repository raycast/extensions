import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { Preferences, Session } from "./types";
import { autoSaveSession } from "./autosave";

const SESSIONS_KEY = "sessions";

function sameCalendarDay(aMs: number, bMs: number): boolean {
  const a = new Date(aMs);
  const b = new Date(bMs);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export async function getSessions(): Promise<Session[]> {
  const raw = await LocalStorage.getItem<string>(SESSIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Session[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveSessions(sessions: Session[]): Promise<void> {
  await LocalStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function getActiveSession(): Promise<Session | undefined> {
  const sessions = await getSessions();
  return sessions.find((s) => s.isActive);
}

/** Upsert a single session by id, preserving the rest. */
export async function upsertSession(session: Session): Promise<void> {
  const sessions = await getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) sessions[idx] = session;
  else sessions.push(session);
  await saveSessions(sessions);
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await getSessions();
  await saveSessions(sessions.filter((s) => s.id !== id));
}

/** Removes every session, including any active one. */
export async function clearAllSessions(): Promise<void> {
  await saveSessions([]);
}

export function createSession(name: string): Session {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    startedAt: Date.now(),
    isActive: true,
    paused: false,
    autoPaused: false,
    spaces: {},
  };
}

/** Starts a new session, deactivating (and stopping) any currently active one. */
export async function startSession(name?: string): Promise<Session> {
  const sessions = await getSessions();
  const now = Date.now();
  const stopped: Session[] = [];
  for (const s of sessions) {
    if (s.isActive) {
      s.isActive = false;
      s.stoppedAt = now;
      s.lastTick = undefined;
      stopped.push(s);
    }
  }
  const label = name?.trim() || defaultSessionName();
  const session = createSession(label);
  sessions.push(session);
  await saveSessions(sessions);
  for (const s of stopped) await autoSaveSession(s); // persist the replaced session if enabled
  return session;
}

/** Stops the active session. Returns the CSV path if auto-save wrote one. */
export async function stopActiveSession(): Promise<string | undefined> {
  const sessions = await getSessions();
  const now = Date.now();
  const stopped: Session[] = [];
  for (const s of sessions) {
    if (s.isActive) {
      s.isActive = false;
      s.stoppedAt = now;
      s.lastTick = undefined;
      stopped.push(s);
    }
  }
  await saveSessions(sessions);
  let savedPath: string | undefined;
  for (const s of stopped) {
    const p = await autoSaveSession(s);
    if (p) savedPath = p;
  }
  return savedPath;
}

/**
 * If Automatic Daily Session is on, close any active session left over from a previous calendar
 * day — backdated to its last recorded activity — and auto-save it. Does NOT start a new session
 * (the daily auto-start handles that). Called before every tick so a stale session can never
 * accumulate the new day's time.
 */
export async function finalizeStaleDailySession(): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.autoDailySession) return;
  const sessions = await getSessions();
  const now = Date.now();
  let finalized: Session | undefined;
  for (const s of sessions) {
    if (s.isActive && !sameCalendarDay(s.startedAt, now)) {
      s.isActive = false;
      s.stoppedAt = s.lastActiveAt ?? s.lastTick ?? s.startedAt; // backdate to last activity
      s.lastTick = undefined;
      finalized = s;
    }
  }
  if (finalized) {
    await saveSessions(sessions);
    await autoSaveSession(finalized);
  }
}

export async function renameSession(id: string, name: string): Promise<void> {
  const sessions = await getSessions();
  const s = sessions.find((x) => x.id === id);
  if (s) {
    s.name = name.trim() || s.name;
    await saveSessions(sessions);
  }
}

function defaultSessionName(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
