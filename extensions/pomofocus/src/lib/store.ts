import { LocalStorage } from "@raycast/api";
import type { TimerState } from "./timer";

const KEY = "timer";

export async function loadState(): Promise<TimerState | null> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TimerState;
  } catch {
    await LocalStorage.removeItem(KEY);
    return null;
  }
}

export async function saveState(state: TimerState): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(state));
}

export async function clearState(): Promise<void> {
  await LocalStorage.removeItem(KEY);
}
