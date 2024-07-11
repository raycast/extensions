import { LocalStorage } from "@raycast/api";
import type { Timer } from "./timerUtils";

const TIMERS_KEY = "timers";

export async function getStoredTimers(): Promise<Timer[]> {
  const storedTimers = await LocalStorage.getItem<string>(TIMERS_KEY);
  return storedTimers ? JSON.parse(storedTimers) : [];
}

export async function storeTimers(timers: Timer[]): Promise<void> {
  await LocalStorage.setItem(TIMERS_KEY, JSON.stringify(timers));
}
