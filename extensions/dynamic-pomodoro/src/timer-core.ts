import { LocalStorage } from "@raycast/api";
import { INITIAL_STATE, type TimerState } from "./timer-state";
import { parseStoredTimerState } from "./timer-storage";

export * from "./timer-state";
export * from "./timer-actions";
export { parseStoredTimerState } from "./timer-storage";

export const STORAGE_KEY = "dynamic-pomodoro-state-v2";

export async function loadTimerState(): Promise<TimerState> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  return parseStoredTimerState(raw ?? null);
}

export async function saveTimerState(state: TimerState): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
