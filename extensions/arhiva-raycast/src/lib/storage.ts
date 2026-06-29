import { LocalStorage } from "@raycast/api";

import { raycastAuthClient } from "./oauth";

const sessionUserStorageKey = "arhiva:raycast-session-user";

export type StoredSession = Readonly<{
  token: string;
  user: Readonly<{
    email: string;
  }>;
}>;

type StoredSessionUser = StoredSession["user"];

function isStoredSessionUser(value: unknown): value is StoredSessionUser {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<StoredSessionUser>;
  return typeof candidate.email === "string" && candidate.email.length > 0;
}

export async function getStoredSession() {
  const [tokens, rawUser] = await Promise.all([
    raycastAuthClient.getTokens(),
    LocalStorage.getItem<string>(sessionUserStorageKey),
  ]);
  if (tokens?.accessToken == null || tokens.accessToken.length === 0 || rawUser == null) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawUser);
    return isStoredSessionUser(parsed) ? { token: tokens.accessToken, user: parsed } : null;
  } catch {
    return null;
  }
}

export async function setStoredSession(session: StoredSession) {
  await LocalStorage.setItem(sessionUserStorageKey, JSON.stringify(session.user));
  await raycastAuthClient.setTokens({ accessToken: session.token });
}

export async function clearStoredSession() {
  await Promise.all([
    raycastAuthClient.removeTokens(),
    LocalStorage.removeItem(sessionUserStorageKey),
  ]);
}
