import { getAppPreferences } from "./preferences";
import { DailyNoteLogWriter } from "./dailynote-logger";
import { PomodoroLog } from "./timer";
import { SessionLock } from "./lock";

export interface LogWriter {
  /** Append one session to the log. Only called while the session lock is held. */
  writeLog(lock: SessionLock, log: PomodoroLog): Promise<void>;
}

class NullLogWriter implements LogWriter {
  async writeLog(): Promise<void> {
    // no-op
  }
}

export function createLogWriter(): LogWriter {
  const prefs = getAppPreferences();
  if (!prefs.enableLogging) return new NullLogWriter();
  if (prefs.taskMode === "dailynote" && prefs.dailyNotePath) {
    return new DailyNoteLogWriter();
  }
  return new NullLogWriter();
}
