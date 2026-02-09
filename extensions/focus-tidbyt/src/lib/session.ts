import { LocalStorage } from "@raycast/api";

const SESSION_KEY = "focus-tidbyt-session";

export type SessionState = {
  startEpochMs: number;
  endEpochMs: number;
  durationSec: number;
  title?: string;
  installationId: string;
  lastPushedMinute?: number;
  lastPushedAtMs?: number;
};

export async function getSession(): Promise<SessionState | null> {
  const raw = await LocalStorage.getItem<string>(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

export async function saveSession(session: SessionState): Promise<void> {
  await LocalStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await LocalStorage.removeItem(SESSION_KEY);
}
