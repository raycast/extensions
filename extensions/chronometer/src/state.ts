import { LocalStorage } from "@raycast/api";

export interface ChronometerState {
  isRunning: boolean;
  startTime: number | null;
  currentTime: number;
  laps: Lap[];
  lastLapTime: number;
}

export interface Lap {
  number: number;
  time: string;
  totalTime: string;
}

const STORAGE_KEY = "chronometer-state";

export async function getState(): Promise<ChronometerState> {
  const state = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (state) {
    return JSON.parse(state);
  }
  return {
    isRunning: false,
    startTime: null,
    currentTime: 0,
    laps: [],
    lastLapTime: 0,
  };
}

export async function setState(state: ChronometerState): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function resetState(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
