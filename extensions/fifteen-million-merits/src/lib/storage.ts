import { environment, getPreferenceValues, LaunchType, LocalStorage, launchCommand, open } from "@raycast/api";

/**
 * LocalStorage key for storing the current active AI agent session count.
 * This counter tracks how many agent sessions are currently running.
 */
export const STORAGE_KEY = "fifteen-million-merits";

/**
 * LocalStorage key for storing the lifetime merits earned.
 * Merits are incremented each time the counter transitions from 0 to 1+.
 */
export const MERITS_STORAGE_KEY = "fifteen-million-merits-lifetime";

/**
 * LocalStorage key for tracking whether the extension is enabled.
 * When disabled, the extension stops tracking sessions and managing Focus mode.
 */
export const ENABLED_KEY = "fifteen-million-merits-enabled";

/**
 * Parses and validates the distraction threshold preference value.
 *
 * Ensures the threshold is a valid non-negative integer, providing a safe fallback
 * for invalid or missing configuration values.
 *
 * @param value - The raw preference string value from user settings
 * @returns A non-negative integer threshold, defaulting to 0 for invalid input
 *
 * @example
 * parseDistractionThreshold("5")        // 5
 * parseDistractionThreshold("-2")       // 0 (negative values are clamped)
 * parseDistractionThreshold("invalid")  // 0 (NaN fallback)
 * parseDistractionThreshold(undefined)  // 0 (missing value fallback)
 */
function parseDistractionThreshold(value: string | undefined): number {
  if (!value) return 0;

  const parsed = parseInt(value, 10);

  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
}

/**
 * Retrieves the current distraction threshold from user preferences.
 *
 * The threshold determines how many active AI agent sessions are required
 * to disable Focus mode. A higher threshold requires more concurrent sessions
 * before distractions are allowed.
 *
 * @returns The validated threshold value (≥ 0), defaulting to 1
 *
 * @example
 * const threshold = getDistractionThreshold();
 * threshold = 1 (default)
 * threshold = 3 (if user configured it)
 */
export function getDistractionThreshold(): number {
  const { distractionThreshold } = getPreferenceValues<Preferences>();

  return parseDistractionThreshold(distractionThreshold);
}

/**
 * Checks whether the extension is currently enabled.
 *
 * Handles type coercion for stored boolean values, which may be persisted
 * as different types in LocalStorage. Defaults to enabled (true) when no
 * value has been set.
 *
 * @returns Promise resolving to true if enabled, false otherwise
 *
 * @example
 * const enabled = await isEnabled();
 * if (!enabled) {
 *   console.log("Extension is disabled");
 * }
 */
export async function isEnabled(): Promise<boolean> {
  const val = await LocalStorage.getItem<boolean | string | number>(ENABLED_KEY);

  if (val === undefined) return true;
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val !== "false";
  if (typeof val === "number") return val !== 0;

  return true;
}

/**
 * Persists the enabled state of the extension to LocalStorage.
 *
 * Uses double negation to ensure the value is strictly boolean before storage.
 * When disabled, the extension will stop tracking sessions and managing Focus mode.
 *
 * @param enabled - The desired enabled state
 * @returns Promise that resolves when the state has been persisted
 *
 * @example
 * await setEnabled(false);  // Disable the extension
 * await setEnabled(true);   // Re-enable the extension
 */
export async function setEnabled(enabled: boolean): Promise<void> {
  await LocalStorage.setItem(ENABLED_KEY, !!enabled);
}

/**
 * Retrieves the current count of active AI agent sessions from LocalStorage.
 *
 * This count represents how many agent sessions are currently running and
 * is used to determine whether Focus mode should be active or disabled.
 *
 * @returns Promise resolving to the current session count, defaulting to 0 if not set
 *
 * @example
 * const count = await getCount();
 * console.log(`${count} active sessions`);
 */
export async function getCount(): Promise<number> {
  const storedValue = await LocalStorage.getItem(STORAGE_KEY);
  return typeof storedValue === "number" ? storedValue : 0;
}

/**
 * Persists the active session count to LocalStorage.
 *
 * Ensures the count never goes below zero by clamping negative values.
 * This maintains data integrity when decrements occur on an already-zero count.
 *
 * @param count - The new session count to store
 * @returns Promise that resolves when the count has been persisted
 *
 * @example
 * await setCount(3);   // Store count of 3 sessions
 * await setCount(-1);  // Stores 0 (clamped to minimum)
 */
export async function setCount(count: number): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, Math.max(0, count));
}

/**
 * Retrieves the lifetime merits earned by the user.
 *
 * Merits represent how many times the user has started working (counter going from 0 to 1+).
 * This metric gamifies productivity by tracking work session initiations over time.
 *
 * @returns Promise resolving to the total merits earned, defaulting to 0 if not set
 *
 * @example
 * const merits = await getMerits();
 * console.log(`You've earned ${merits} merits`);
 */
export async function getMerits(): Promise<number> {
  const storedValue = await LocalStorage.getItem(MERITS_STORAGE_KEY);
  return typeof storedValue === "number" ? storedValue : 0;
}

/**
 * Persists the lifetime merits count to LocalStorage.
 *
 * Ensures merits never go below zero, maintaining a monotonically increasing
 * (or reset to zero) counter that reflects cumulative productivity.
 *
 * @param merits - The new merits count to store
 * @returns Promise that resolves when the merits have been persisted
 *
 * @example
 * await setMerits(10);   // Update total merits
 * await setMerits(-1);   // Stores 0 (clamped to minimum)
 */
export async function setMerits(merits: number): Promise<void> {
  await LocalStorage.setItem(MERITS_STORAGE_KEY, Math.max(0, merits));
}

/**
 * Atomically increments the lifetime merits counter by 1.
 *
 * This operation reads the current value and writes back an incremented value.
 * Called automatically when the session counter transitions from 0 to 1+,
 * indicating the start of a new work session.
 *
 * @returns Promise that resolves when the merits have been incremented
 *
 * @example
 * await incrementMerits();  // Merits: 5 → 6
 */
export async function incrementMerits(): Promise<void> {
  const currentMerits = await getMerits();
  await setMerits(currentMerits + 1);
}

/**
 * Resets the lifetime merits counter to zero.
 *
 * This is a destructive operation that clears all accumulated merits.
 * Typically called by user action when they want to start fresh.
 *
 * @returns Promise that resolves when the merits have been reset
 *
 * @example
 * await resetMerits();  // Merits: 42 → 0
 */
export async function resetMerits(): Promise<void> {
  await setMerits(0);
}

/**
 * Triggers a background refresh of the menu bar command to update the displayed counter.
 *
 * This function prevents recursive launches by checking if it's already running within
 * the menu bar command itself. It gracefully handles cases where the menu bar command
 * hasn't been activated by the user yet, avoiding unnecessary error logging.
 *
 * Error Handling:
 * - Silently skips refresh if called from within the menu bar command
 * - Logs a message (not error) if menu bar command hasn't been activated
 * - Logs errors for all other failure cases
 *
 * @returns Promise that resolves when the refresh attempt completes
 *
 * @example
 * await refreshMenuBar();  // Triggers background update of menu bar counter
 */
export async function refreshMenuBar() {
  if (environment.commandName === "show-ai-agent-sessions-counter") {
    return;
  }

  try {
    await launchCommand({
      name: "show-ai-agent-sessions-counter",
      type: LaunchType.Background,
    });
  } catch (error) {
    const isNotActivated = error instanceof Error && error.message.includes("must be activated");
    if (isNotActivated) {
      console.log("Menu bar command not yet activated by user. Skipping background refresh.");
      return;
    }

    console.error("Failed to refresh menu bar:", error);
  }
}

/**
 * Manages Raycast Focus mode based on the current active session count.
 *
 * This function implements the core threshold logic that determines whether
 * Focus mode should be active (limiting distractions) or disabled (allowing access).
 *
 * Behavior:
 * - When count >= threshold: Completes/disables Focus mode (user has "earned" distractions)
 * - When count < threshold: Starts Focus mode with configured goal and blocked categories
 *
 * The threshold comparison uses >= (not >) so that with threshold=1, a count of 1
 * active session will disable Focus mode, allowing distractions during active work.
 *
 * @param newCount - The updated session count to evaluate against the threshold
 * @returns Promise that resolves when Focus mode has been updated
 *
 * @example
 * // With threshold=1
 * await handleFocusMode(0);  // 0 >= 1 = false → Start Focus mode
 * await handleFocusMode(1);  // 1 >= 1 = true  → Complete Focus mode
 * await handleFocusMode(2);  // 2 >= 1 = true  → Complete Focus mode
 */
export async function handleFocusMode(newCount: number): Promise<void> {
  const threshold = getDistractionThreshold();

  if (newCount >= threshold) {
    return open("raycast://focus/complete");
  }

  const { focusGoal, focusCategories } = getPreferenceValues<Preferences>();

  const encodedGoal = encodeURIComponent(focusGoal);
  const focusUrl = `raycast://focus/start?goal=${encodedGoal}&categories=${focusCategories}`;
  await open(focusUrl);
}

/**
 * Synchronizes Focus mode state when the session count changes.
 *
 * This function implements an edge-detection pattern to determine if Focus mode
 * needs to be toggled. It only triggers a state change when the count crosses
 * the threshold boundary (either direction), preventing redundant updates.
 *
 * The XOR comparison `(current >= threshold) !== (next >= threshold)` evaluates to true
 * only when exactly one of the two counts satisfies the threshold condition,
 * indicating a boundary crossing that requires Focus mode to be toggled.
 *
 * Edge Cases:
 * - current=0, next=1, threshold=1: false >= true → toggle (0 >= 1 is false, 1 >= 1 is true)
 * - current=1, next=2, threshold=1: true === true → no toggle (both satisfy threshold)
 * - current=2, next=1, threshold=1: true === true → no toggle (both satisfy threshold)
 * - current=1, next=0, threshold=1: true !== false → toggle (1 >= 1 is true, 0 >= 1 is false)
 *
 * @param current - The previous session count before the change
 * @param next - The new session count after the change
 * @returns Promise that resolves when synchronization is complete
 *
 * @example
 * With threshold=1
 * await syncFocusMode(0, 1);  // Toggles: false !== true → calls handleFocusMode(1)
 * await syncFocusMode(1, 2);  // No change: true === true → no action
 * await syncFocusMode(2, 0);  // Toggles: true !== false → calls handleFocusMode(0)
 */
export async function syncFocusMode(current: number, next: number): Promise<void> {
  const threshold = getDistractionThreshold();
  if ((current >= threshold) !== (next >= threshold)) {
    await handleFocusMode(next);
  }
}

/**
 * Atomically updates the session counter by a delta value and manages side effects.
 *
 * This function serves as the primary interface for incrementing or decrementing
 * the active session count. It handles several important responsibilities:
 *
 * 1. Reads current count
 * 2. Applies delta with floor clamping at 0
 * 3. Awards a merit on 0→1+ transitions (starting work)
 * 4. Persists new count
 * 5. Returns complete state snapshot
 *
 * The merit increment occurs only when transitioning from zero to non-zero,
 * ensuring merits represent distinct work session initiations rather than
 * incremental session additions.
 *
 * @param delta - The amount to add (positive) or subtract (negative) from the current count
 * @returns Promise resolving to an object containing:
 *   - currentCount: The count before the update
 *   - newCount: The count after the update (clamped to >= 0)
 *   - newMerits: The total merits after potential increment
 *
 * @example
 * const result = await updateCounter(1);
 * // result = { currentCount: 0, newCount: 1, newMerits: 15 }
 *
 * const result2 = await updateCounter(-1);
 * // result2 = { currentCount: 1, newCount: 0, newMerits: 15 }
 *
 * const result3 = await updateCounter(-5);
 * // result3 = { currentCount: 0, newCount: 0, newMerits: 15 } (clamped at 0)
 */
export async function updateCounter(
  delta: number,
): Promise<{ currentCount: number; newCount: number; newMerits: number }> {
  const currentCount = await getCount();
  const newCount = Math.max(0, currentCount + delta);

  if (currentCount === 0 && newCount > 0) {
    await incrementMerits();
  }

  await setCount(newCount);
  const newMerits = await getMerits();

  return { currentCount, newCount, newMerits };
}

/**
 * Resets the active session counter to zero.
 *
 * This is a convenience wrapper around setCount(0) that provides a semantic
 * interface for clearing all active sessions. Note that this does NOT reset
 * lifetime merits - use resetMerits() separately if that's desired.
 *
 * Common use cases:
 * - Manual reset by user action
 * - Error recovery when sessions become desynchronized
 * - System shutdown/restart hooks
 *
 * @returns Promise that resolves when the counter has been reset
 *
 * @example
 * await resetCounter();  // Count: 5 → 0
 */
export async function resetCounter(): Promise<void> {
  await setCount(0);
}
