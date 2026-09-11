import { LocalStorage } from "@raycast/api";

import type { AuthSession } from "./provider";

const SESSION_KEY = "ipfos.auth.session";
const EXPIRY_SKEW_MS = 60_000;

export async function readSession(): Promise<AuthSession | undefined> {
  const raw = await LocalStorage.getItem<string>(SESSION_KEY);
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    await LocalStorage.removeItem(SESSION_KEY);
    return undefined;
  }
}

export async function writeSession(session: AuthSession): Promise<void> {
  await LocalStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await LocalStorage.removeItem(SESSION_KEY);
}

const isPast = (isoTimestamp: string): boolean => {
  const expiresAt = Date.parse(isoTimestamp);
  if (Number.isNaN(expiresAt)) return true;
  return expiresAt - EXPIRY_SKEW_MS <= Date.now();
};

export const isAccessTokenExpired = (session: AuthSession): boolean => isPast(session.accessTokenExpiresAt);

export const isRefreshTokenExpired = (session: AuthSession): boolean => isPast(session.refreshTokenExpiresAt);

export async function expireAccessToken(): Promise<void> {
  const session = await readSession();
  if (!session) return;
  await writeSession({ ...session, accessTokenExpiresAt: new Date(0).toISOString() });
}
