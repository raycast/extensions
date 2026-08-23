import { getPreferenceValues, LocalStorage } from "@raycast/api";

/** Lock threshold in milliseconds, computed once from preferences. "-1" (Never) becomes negative. */
const LOCK_AFTER_MS = Number(getPreferenceValues().lockAfterInactivity) * 60_000;

/** LocalStorage key under which the last activity timestamp is persisted. */
const LAST_ACTIVITY_KEY = "lastActivity";

/** Module-level debounce guard for `recordActivity` to avoid thrashing LocalStorage. */
let lastWriteTime = 0;

/** Reads and validates the last activity timestamp. Returns null for missing/empty/NaN. */
const readLastActivityMs = async (): Promise<number | null> => {
  const last = await LocalStorage.getItem<string>(LAST_ACTIVITY_KEY);
  if (last === undefined || last === null || last === "") return null;
  const ms = Number(last);
  return Number.isNaN(ms) ? null : ms;
};

class InactivityTimer {
  /**
   * Checks whether the user has performed an activity recently.
   *
   * Reads the last activity timestamp from LocalStorage and returns `true` if it
   * falls within `LOCK_AFTER_MS`. A missing/empty/NaN stored value is treated as
   * "locked" (returns `false`) so a fresh session never auto-unlocks. When
   * auto-lock is disabled (`LOCK_AFTER_MS <= 0`, i.e. "Never"), always returns `true`.
   *
   * @returns {Promise<boolean>} - Whether the user has recent activity.
   */
  static hasRecentActivity = async (): Promise<boolean> => {
    if (LOCK_AFTER_MS <= 0) return true;
    const ms = await readLastActivityMs();
    if (ms === null) return false;
    return Date.now() - ms <= LOCK_AFTER_MS;
  };

  /**
   * Records user activity by persisting the current timestamp to LocalStorage.
   *
   * No-op when auto-lock is disabled (`LOCK_AFTER_MS <= 0`). Otherwise debounced
   * to at most one write per second using the module-level `lastWriteTime` guard,
   * which persists across calls within a session.
   *
   * @returns {Promise<void>}
   */
  static recordActivity = async (): Promise<void> => {
    if (LOCK_AFTER_MS <= 0) return;
    if (Date.now() - lastWriteTime < 1000) return;
    lastWriteTime = Date.now();
    await LocalStorage.setItem(LAST_ACTIVITY_KEY, Date.now());
  };

  /**
   * Starts a read-only interval that invokes `onLock` once the last activity
   * timestamp exceeds `LOCK_AFTER_MS`.
   *
   * No-op when auto-lock is disabled (`LOCK_AFTER_MS <= 0`), returning a no-op
   * cleanup. The interval only reads LocalStorage — it never writes — so that
   * inactivity is correctly detected rather than continually reset.
   *
   * @param {() => void} onLock - Callback invoked when the inactivity threshold is exceeded.
   * @returns {() => void} - A cleanup function that stops the watcher.
   */
  static startLockWatcher = (onLock: () => void): (() => void) => {
    if (LOCK_AFTER_MS <= 0) return () => {};
    const id = setInterval(async () => {
      const ms = await readLastActivityMs();
      if (ms === null || Date.now() - ms > LOCK_AFTER_MS) {
        onLock();
      }
    }, 10_000);
    return () => clearInterval(id);
  };
}

export { InactivityTimer, LOCK_AFTER_MS };
