import { LocalStorage } from "@raycast/api";
import { STORAGE_KEYS } from "../constants";
import type { ActiveState } from "../types";

const DEFAULT_STATE: Omit<ActiveState, "lastCheckTime"> = {
  accumulatedActiveSeconds: 0,
  sessionCount: 0,
  isIdle: false,
  shouldNotify: false,
};

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

export async function saveActiveState(state: ActiveState): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.ACTIVE_STATE, JSON.stringify(state));
}

export async function resetSessionTimeOnly(): Promise<void> {
  const currentState = await getActiveState();
  const newState: ActiveState = {
    ...currentState,
    accumulatedActiveSeconds: 0,
    lastCheckTime: Date.now(),
  };
  await saveActiveState(newState);
}

export async function resetStatsOnly(): Promise<void> {
  const currentState = await getActiveState();
  const newState: ActiveState = {
    ...currentState,
    sessionCount: 0,
    lastCheckTime: Date.now(),
  };
  await saveActiveState(newState);
}

export async function resetActiveState(): Promise<void> {
  const newState: ActiveState = {
    ...DEFAULT_STATE,
    lastCheckTime: Date.now(),
  };
  await saveActiveState(newState);
}
