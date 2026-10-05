import { LocalStorage } from "@raycast/api";
import { STORAGE_KEYS } from "../constants";
import type { ActiveState } from "../types";

const DEFAULT_STATE: Omit<ActiveState, "lastCheckTime"> = {
  accumulatedActiveSeconds: 0,
  sessionCount: 0,
  isIdle: false,
  shouldNotify: false,
};

/**
 * Type guard to validate if an unknown object is a valid ActiveState.
 *
 * @param obj - The object to validate
 * @returns True if obj is a valid ActiveState
 */
function isValidActiveState(obj: unknown): obj is ActiveState {
  if (typeof obj !== "object" || obj === null) return false;
  const state = obj as Record<string, unknown>;
  return (
    typeof state.accumulatedActiveSeconds === "number" &&
    typeof state.lastCheckTime === "number" &&
    typeof state.sessionCount === "number" &&
    typeof state.isIdle === "boolean" &&
    typeof state.shouldNotify === "boolean"
  );
}

/**
 * Retrieves the active state from local storage.
 * Returns default state if no valid state is found.
 *
 * @returns The active state
 */
export async function getActiveState(): Promise<ActiveState> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.ACTIVE_STATE);
  if (!stored) return { ...DEFAULT_STATE, lastCheckTime: Date.now() };

  try {
    const parsed = JSON.parse(stored);
    if (isValidActiveState(parsed)) {
      return parsed;
    }
    return { ...DEFAULT_STATE, lastCheckTime: Date.now() };
  } catch {
    return { ...DEFAULT_STATE, lastCheckTime: Date.now() };
  }
}

/**
 * Persists the active state to local storage.
 *
 * @param state - The state to save
 */
export async function saveActiveState(state: ActiveState): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.ACTIVE_STATE, JSON.stringify(state));
}

/**
 * Resets only the accumulated active time, preserving session count.
 */
export async function resetSessionTimeOnly(): Promise<void> {
  const currentState = await getActiveState();
  const newState: ActiveState = {
    ...currentState,
    accumulatedActiveSeconds: 0,
    lastCheckTime: Date.now(),
  };
  await saveActiveState(newState);
}

/**
 * Resets only the session count, preserving active time.
 */
export async function resetStatsOnly(): Promise<void> {
  const currentState = await getActiveState();
  const newState: ActiveState = {
    ...currentState,
    sessionCount: 0,
    lastCheckTime: Date.now(),
  };
  await saveActiveState(newState);
}

/**
 * Resets the entire active state to defaults.
 */
export async function resetActiveState(): Promise<void> {
  const newState: ActiveState = {
    ...DEFAULT_STATE,
    lastCheckTime: Date.now(),
  };
  await saveActiveState(newState);
}

/**
 * Retrieves the confetti enabled preference from storage.
 * Defaults to true if not set.
 *
 * @returns True if confetti is enabled
 */
export async function getConfettiEnabled(): Promise<boolean> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.CONFETTI_ENABLED);
  if (stored === undefined) return true;
  return stored === "true";
}

/**
 * Persists the confetti enabled preference to storage.
 *
 * @param enabled - Whether confetti should be enabled
 */
export async function setConfettiEnabled(enabled: boolean): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.CONFETTI_ENABLED, enabled.toString());
}
