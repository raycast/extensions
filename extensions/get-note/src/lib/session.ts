import { LocalStorage, getPreferenceValues } from "@raycast/api";

import { GETNOTE_DEFAULT_CLIENT_ID, GETNOTE_PENDING_AUTH_KEY, GETNOTE_SESSION_KEY } from "./constants";
import { GetNoteCredentials, PendingDeviceAuthorizationSession, StoredGetNoteSession } from "./types";

export async function saveCredentials(session: StoredGetNoteSession): Promise<void> {
  await LocalStorage.setItem(GETNOTE_SESSION_KEY, JSON.stringify(session));
}

export async function clearStoredCredentials(): Promise<void> {
  await LocalStorage.removeItem(GETNOTE_SESSION_KEY);
}

export async function getStoredCredentials(): Promise<GetNoteCredentials | null> {
  const raw = await LocalStorage.getItem<string>(GETNOTE_SESSION_KEY);

  if (!raw) {
    return null;
  }

  let session: StoredGetNoteSession;

  try {
    session = JSON.parse(raw) as StoredGetNoteSession;
  } catch {
    await clearStoredCredentials();
    return null;
  }

  if (!session?.apiKey) {
    return null;
  }

  if (session.expiresAt && session.expiresAt * 1000 <= Date.now()) {
    await clearStoredCredentials();
    return null;
  }

  return {
    apiKey: session.apiKey,
    clientId: session.clientId || GETNOTE_DEFAULT_CLIENT_ID,
    expiresAt: session.expiresAt,
    source: "local-storage",
  };
}

function getManualCredentials(): GetNoteCredentials | null {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.manualApiKey?.trim();

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    clientId: preferences.manualClientId?.trim() || GETNOTE_DEFAULT_CLIENT_ID,
    source: "preferences",
  };
}

export async function resolveCredentials(): Promise<GetNoteCredentials | null> {
  return getManualCredentials() || (await getStoredCredentials());
}

export async function savePendingAuthorizationSession(session: PendingDeviceAuthorizationSession): Promise<void> {
  await LocalStorage.setItem(GETNOTE_PENDING_AUTH_KEY, JSON.stringify(session));
}

export async function getPendingAuthorizationSession(): Promise<PendingDeviceAuthorizationSession | null> {
  const raw = await LocalStorage.getItem<string>(GETNOTE_PENDING_AUTH_KEY);

  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as PendingDeviceAuthorizationSession;

    if (Date.now() >= session.createdAt + session.expiresIn * 1000) {
      await clearPendingAuthorizationSession();
      return null;
    }

    return session;
  } catch {
    await clearPendingAuthorizationSession();
    return null;
  }
}

export async function clearPendingAuthorizationSession(): Promise<void> {
  await LocalStorage.removeItem(GETNOTE_PENDING_AUTH_KEY);
}
