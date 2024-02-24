import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { LOCAL_STORAGE_KEY, VAULT_LOCK_MESSAGES } from "~/constants/general";
import { VAULT_TIMEOUT } from "~/constants/preferences";
import { SessionState } from "~/types/session";
import { exec as callbackExec } from "child_process";
import { promisify } from "util";
import { captureException, debugLog } from "~/utils/development";

const exec = promisify(callbackExec);

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

  if (vaultTimeoutMs === VAULT_TIMEOUT.SYSTEM_LOCK) {
    return {
      ...loadedState,
      shouldLockVault: await checkScreenWasLockedSinceLastAccess(lastActivityTime),
      lockReason: VAULT_LOCK_MESSAGES.SYSTEM_LOCK,
    };
  }

  const timeElapseSinceLastPasswordEnter = Date.now() - lastActivityTime.getTime();
  if (vaultTimeoutMs === VAULT_TIMEOUT.IMMEDIATELY || timeElapseSinceLastPasswordEnter >= vaultTimeoutMs) {
    return { ...loadedState, shouldLockVault: true, lockReason: VAULT_LOCK_MESSAGES.TIMEOUT };
  }

  return { ...loadedState, shouldLockVault: false };
}

export async function checkScreenWasLockedSinceLastAccess(lastActivityTime: Date): Promise<boolean> {
  const lastScreenLockTime = await getLastScreenLockTime();
  if (!lastScreenLockTime) return true; // assume the screen was locked for improved safety
  return new Date(lastScreenLockTime).getTime() > lastActivityTime.getTime();
}

const TIME_SPAN_INCREMENT_HOURS = 2;
const MAX_RETRY_ATTEMPTS = 5;
/**
 * Starts by checking the last hour and increases the time span by {@link TIME_SPAN_INCREMENT_HOURS} hours on each retry.
 * ⚠️ Calls to the system log are very slow, and if the screen hasn't been locked for some hours, it gets slower.
 */
async function getLastScreenLockTime(timeSpanHours = 1, retryAttempt = 0): Promise<Date | undefined> {
  try {
    if (retryAttempt > MAX_RETRY_ATTEMPTS) {
      debugLog("Max retry attempts reached to get last screen lock time");
      return undefined;
    }
    const { stdout, stderr } = await exec(
      `log show --style syslog --predicate "process == 'loginwindow'" --info --last ${timeSpanHours}h | grep "handleUnlockResult" | tail -n 1`
    );
    const [logDate, logTime] = stdout?.split(" ") ?? [];
    if (stderr || !logDate || !logTime) {
      return getLastScreenLockTime(timeSpanHours + TIME_SPAN_INCREMENT_HOURS, retryAttempt + 1);
    }

    const logFullDate = new Date(`${logDate}T${logTime}`);
    if (!logFullDate || logFullDate.toString() === "Invalid Date") return undefined;

    return logFullDate;
  } catch (error) {
    captureException("Failed to get last screen lock time", error);
    return undefined;
  }
}
