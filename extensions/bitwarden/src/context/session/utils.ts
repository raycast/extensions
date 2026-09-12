import { LocalStorage } from "@raycast/api";
import { LOCAL_STORAGE_KEY } from "~/constants/general";
import { exec as callbackExec, PromiseWithChild } from "child_process";
import { promisify } from "util";
import { captureException, debugLog } from "~/utils/development";

const exec = promisify(callbackExec);

export const SessionStorage = {
  getSavedSession: () => {
    return Promise.all([
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.SESSION_TOKEN),
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.REPROMPT_HASH),
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.LAST_ACTIVITY_TIME),
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.VAULT_LAST_STATUS),
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
    ]);
  },
};

export const checkSystemLockedSinceLastAccess = (lastActivityTime: Date) => {
  return checkSystemLogTimeAfter(lastActivityTime, (time: number) => getLastSyslog(time, "handleUnlockResult"));
};
export const checkSystemSleptSinceLastAccess = (lastActivityTime: Date) => {
  return checkSystemLogTimeAfter(lastActivityTime, (time: number) => getLastSyslog(time, "sleep 0"));
};

function getLastSyslog(hours: number, filter: string) {
  return exec(
    `log show --style syslog --predicate "process == 'loginwindow'" --info --last ${hours}h | grep "${filter}" | tail -n 1`
  );
}

export async function checkSystemLogTimeAfter(
  time: Date,
  getLogEntry: (timeSpanHours: number) => PromiseWithChild<{ stdout: string; stderr: string }>
): Promise<boolean> {
  const lastScreenLockTime = await getSystemLogTime(getLogEntry);
  if (!lastScreenLockTime) return true; // assume that log was found for improved safety
  return new Date(lastScreenLockTime).getTime() > time.getTime();
}

const getSystemLogTime_INCREMENT_HOURS = 2;
const getSystemLogTime_MAX_RETRIES = 5;
/**
 * Starts by checking the last hour and increases the time span by {@link getSystemLogTime_INCREMENT_HOURS} hours on each retry.
 * ⚠️ Calls to the system log are very slow, and if the screen hasn't been locked for some hours, it gets slower.
 */
async function getSystemLogTime(
  getLogEntry: (timeSpanHours: number) => PromiseWithChild<{ stdout: string; stderr: string }>,
  timeSpanHours = 1,
  retryAttempt = 0
): Promise<Date | undefined> {
  try {
    if (retryAttempt > getSystemLogTime_MAX_RETRIES) {
      debugLog("Max retry attempts reached to get last screen lock time");
      return undefined;
    }
    const { stdout, stderr } = await getLogEntry(timeSpanHours);
    const [logDate, logTime] = stdout?.split(" ") ?? [];
    if (stderr || !logDate || !logTime) {
      return getSystemLogTime(getLogEntry, timeSpanHours + getSystemLogTime_INCREMENT_HOURS, retryAttempt + 1);
    }

    const logFullDate = new Date(`${logDate}T${logTime}`);
    if (!logFullDate || logFullDate.toString() === "Invalid Date") return undefined;

    return logFullDate;
  } catch (error) {
    captureException("Failed to get last screen lock time", error);
    return undefined;
  }
}
