import { LocalStorage } from "@raycast/api";

import type { StoredSession } from "./types";

const LAST_SYNCED_AT_KEY = "lastSyncedAt";
const FOCUS_SESSIONS_KEY = "focusSessions";

export async function getLastSyncedAt(): Promise<string | null> {
  const value = await LocalStorage.getItem<string>(LAST_SYNCED_AT_KEY);
  return value ?? null;
}

export async function setLastSyncedAt(value: string): Promise<void> {
  await LocalStorage.setItem(LAST_SYNCED_AT_KEY, value);
}

export async function getStoredSessions(): Promise<StoredSession[]> {
  const raw = await LocalStorage.getItem<string>(FOCUS_SESSIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setStoredSessions(sessions: StoredSession[]): Promise<void> {
  await LocalStorage.setItem(FOCUS_SESSIONS_KEY, JSON.stringify(sessions));
}

/**
 * Appends one session to stored sessions. Skips if same start+goal already exists.
 */
export async function addStoredSession(session: StoredSession): Promise<void> {
  const existing = await getStoredSessions();
  const duplicate = existing.some((s) => s.start === session.start && s.goal === session.goal);
  if (duplicate) return;
  const next = [...existing, session].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  await setStoredSessions(next);
}
