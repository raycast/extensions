import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { LOCAL_STORAGE_KEY, VAULT_LOCK_MESSAGES } from "~/constants/general";
import { VAULT_TIMEOUT } from "~/constants/preferences";
import { SessionState } from "~/types/session";

export const SessionStorage = {
  getSavedSession: () => {
    return Promise.all([
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.SESSION_TOKEN),
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.REPROMPT_HASH),
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.LAST_ACTIVITY_TIME),
    ]);
  },
  clearSession: async () => {
    await Promise.all([
      LocalStorage.removeItem(LOCAL_STORAGE_KEY.SESSION_TOKEN),
      LocalStorage.removeItem(LOCAL_STORAGE_KEY.REPROMPT_HASH),
    ]);
  },
  saveSession: async (token: string, passwordHash: string) => {
    await Promise.all([
      LocalStorage.setItem(LOCAL_STORAGE_KEY.SESSION_TOKEN, token),
      LocalStorage.setItem(LOCAL_STORAGE_KEY.REPROMPT_HASH, passwordHash),
    ]);
  },
  logoutClearSession: async () => {
    // clear everything related to the session
    await Promise.all([
      LocalStorage.removeItem(LOCAL_STORAGE_KEY.SESSION_TOKEN),
      LocalStorage.removeItem(LOCAL_STORAGE_KEY.REPROMPT_HASH),
      LocalStorage.removeItem(LOCAL_STORAGE_KEY.LAST_ACTIVITY_TIME),
      LocalStorage.removeItem(LOCAL_STORAGE_KEY.VAULT_LOCK_REASON),
    ]);
  },
};

export type SavedSessionState = {
  token?: SessionState["token"];
  passwordHash?: SessionState["passwordHash"];
  lastActivityTime?: SessionState["lastActivityTime"];
  shouldLockVault?: boolean;
  lockReason?: string;
};

export async function getSavedSession(): Promise<SavedSessionState> {
  const [token, passwordHash, lastActivityTimeString] = await SessionStorage.getSavedSession();
  if (!token || !passwordHash) return { shouldLockVault: true };

  const loadedState: SavedSessionState = { token, passwordHash };
  if (!lastActivityTimeString) return { ...loadedState, shouldLockVault: false };

  const lastActivityTime = new Date(lastActivityTimeString);
  loadedState.lastActivityTime = lastActivityTime;
  const vaultTimeoutMs = +getPreferenceValues<Preferences>().repromptIgnoreDuration;
  if (vaultTimeoutMs === VAULT_TIMEOUT.NEVER) return { ...loadedState, shouldLockVault: false };

  const timeElapseSinceLastPasswordEnter = Date.now() - lastActivityTime.getTime();
  if (vaultTimeoutMs === VAULT_TIMEOUT.IMMEDIATELY || timeElapseSinceLastPasswordEnter >= vaultTimeoutMs) {
    return { ...loadedState, shouldLockVault: true, lockReason: VAULT_LOCK_MESSAGES.TIMEOUT };
  }

  return { ...loadedState, shouldLockVault: false };
}
