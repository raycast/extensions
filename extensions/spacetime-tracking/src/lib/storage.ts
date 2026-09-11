import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { Session } from "./types";
import { autoSaveSession, deleteAutoSavedSession } from "./autosave";
import { MAX_TICK_DELTA_SECONDS } from "./consts";

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

/**
 * Session start time, never earlier than 00:01 of the current day. Avoids
 * date-boundary issues (e.g. a start stamped exactly at midnight) in filenames
 * and same-day comparisons — leaving a 1-minute untracked gap after midnight.
 */
function sessionStartTime(): number {
  const now = new Date();
  const earliest = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 1, 0, 0).getTime();
  return Math.max(Date.now(), earliest);
}

export function createSession(name: string): Session {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    startedAt: sessionStartTime(),
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

/**
 * Reactivates a previously stopped session so tracking continues into it.
 * No-op when another session is already active. Returns the resumed session,
 * or undefined if it couldn't be resumed.
 */
export async function resumeSession(id: string): Promise<Session | undefined> {
  const sessions = await getSessions();
  if (sessions.some((s) => s.isActive)) return undefined;
  const session = sessions.find((s) => s.id === id);
  if (!session) return undefined;
  session.isActive = true;
  session.stoppedAt = undefined;
  session.paused = false;
  session.autoPaused = false;
  session.lastTick = undefined; // restart the delta clock so the paused gap isn't counted
  await saveSessions(sessions);
  // Drop the stale on-disk export; it'll be rewritten when the session stops again.
  await deleteAutoSavedSession(session);
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
 * Keep every session within a single calendar day. If an active session has crossed midnight,
 * close it at the 00:00 boundary and start a fresh session for the new day. Gated on the
 * "Keep Sessions Within One Day" preference (on by default); called before every tick so a session
 * can never span two days.
 *
 * The old session's stop time is min(last activity, midnight ending its day):
 *  - Continuous work across midnight (small gap): credit the final stretch up to *exactly* 00:00
 *    and stop there.
 *  - Real gap, e.g. laptop closed at 16:00 and reopened next morning: the gap exceeds the per-tick
 *    cap, so no midnight credit — stop at the real last activity (16:00).
 * The replacement session gets the default date/time name and starts at max(now, 00:01).
 */
export async function rolloverStaleSession(): Promise<void> {
  if (!getPreferenceValues<Preferences>().splitAtMidnight) return;
  const sessions = await getSessions();
  const now = Date.now();
  let finalized: Session | undefined;
  for (const s of sessions) {
    if (!s.isActive || sameCalendarDay(s.startedAt, now)) continue;

    // Midnight ending the session's OWN start day (local time; d+1 rolls month/year over).
    const start = new Date(s.startedAt);
    const endOfStartDay = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1, 0, 0, 0, 0).getTime();

    let stoppedAt: number | undefined;
    if (s.lastTick != null) {
      const deltaToMidnight = (endOfStartDay - s.lastTick) / 1000;
      if (deltaToMidnight > 0 && deltaToMidnight <= MAX_TICK_DELTA_SECONDS) {
        // Continuous across midnight: credit the last space up to exactly 00:00.
        const rec = s.lastSpaceKey ? s.spaces[s.lastSpaceKey] : undefined;
        if (rec) rec.seconds += deltaToMidnight;
        stoppedAt = endOfStartDay;
      }
    }
    if (stoppedAt == null) stoppedAt = s.lastActiveAt ?? s.lastTick ?? s.startedAt; // real gap: last activity

    s.isActive = false;
    s.stoppedAt = stoppedAt;
    s.lastTick = undefined;
    finalized = s;
  }

  if (finalized) {
    await saveSessions(sessions); // persist first so startSession() sees the old one inactive
    await autoSaveSession(finalized);
    // Start the new day's session, unless a concurrent tick already started one.
    const fresh = await getSessions();
    if (!fresh.some((s) => s.isActive)) await startSession();
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
