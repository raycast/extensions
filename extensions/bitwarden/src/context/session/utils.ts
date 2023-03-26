import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { useReducer } from "react";
import { LOCAL_STORAGE_KEY } from "~/constants/general";
import { Preferences } from "~/types/preferences";
import { SessionState } from "~/types/session";

const initialState: SessionState = {
  token: undefined,
  isLoading: true,
  isLocked: false,
  isAuthenticated: false,
  passwordHash: undefined,
  lastActivityTime: undefined,
};

type SessionReducerActions =
  | { type: "lock" }
  | { type: "unlock"; token: string; passwordHash: string }
  | { type: "logout" }
  | { type: "vaultTimeout" }
  | {
      type: "loadSavedState";
      token?: string;
      passwordHash?: string;
      lastActivityTime?: Date;
      shouldLockVault?: boolean;
    }
  | { type: "failedLoadSavedState" };

export const useSessionReducer = () => {
  return useReducer((state: SessionState, action: SessionReducerActions): SessionState => {
    console.log({ state, action });
    switch (action.type) {
      case "lock": {
        return { ...state, token: undefined, passwordHash: undefined, isLoading: false, isLocked: true };
      }
      case "unlock": {
        return { ...state, token: action.token, passwordHash: action.passwordHash, isLocked: false };
      }
      case "logout": {
        return { ...state, token: undefined, passwordHash: undefined, isAuthenticated: false };
      }
      case "vaultTimeout": {
        return { ...state, isLocked: true };
      }
      case "loadSavedState": {
        const hasToken = !!action.token;
        return {
          ...state,
          token: action.token,
          passwordHash: action.passwordHash,
          lastActivityTime: action.lastActivityTime,
          isLoading: false,
          isLocked: action.shouldLockVault || !hasToken,
          isAuthenticated: hasToken,
        };
      }
      case "failedLoadSavedState": {
        return { ...state, isLoading: false, isLocked: true };
      }
      default:
        return state;
    }
  }, initialState);
};

export const Storage = {
  getSavedSession: () => {
    return Promise.all([
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.SESSION_TOKEN),
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.REPROMPT_HASH),
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.LAST_ACTIVITY_TIME),
    ]);
  },
  clearSession: () => {
    return Promise.all([
      LocalStorage.removeItem(LOCAL_STORAGE_KEY.SESSION_TOKEN),
      LocalStorage.removeItem(LOCAL_STORAGE_KEY.REPROMPT_HASH),
    ]);
  },
  saveSession: (token: string, passwordHash: string) => {
    return Promise.all([
      LocalStorage.setItem(LOCAL_STORAGE_KEY.SESSION_TOKEN, token),
      LocalStorage.setItem(LOCAL_STORAGE_KEY.REPROMPT_HASH, passwordHash),
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

const VAULT_TIMEOUT_MESSAGE = "Vault timed out due to inactivity";

export async function getSavedSession(): Promise<SavedSessionState> {
  const loadedState: SavedSessionState = {};
  const [token, passwordHash, lastActivityTimeString] = await Storage.getSavedSession();

  if (!token || !passwordHash) return { ...loadedState, shouldLockVault: true };
  loadedState.token = token;
  loadedState.passwordHash = passwordHash;

  if (!lastActivityTimeString) return { ...loadedState, shouldLockVault: false };

  const lastActivityTime = new Date(lastActivityTimeString);
  loadedState.lastActivityTime = lastActivityTime;

  const vaultTimeoutMs = +getPreferenceValues<Preferences>().repromptIgnoreDuration;
  if (vaultTimeoutMs === 0) return { ...loadedState, shouldLockVault: true, lockReason: VAULT_TIMEOUT_MESSAGE };

  if (lastActivityTime != null) {
    const timeElapseSinceLastPasswordEnter = Date.now() - lastActivityTime.getTime();
    if (timeElapseSinceLastPasswordEnter >= vaultTimeoutMs) {
      return { ...loadedState, shouldLockVault: true, lockReason: VAULT_TIMEOUT_MESSAGE };
    }
  }

  return { ...loadedState, shouldLockVault: false };
}
