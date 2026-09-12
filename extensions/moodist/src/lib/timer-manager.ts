import { LocalStorage } from "@raycast/api";
import { STORAGE_KEYS } from "./constants";
import type { TimerState } from "../types";

const DEFAULT_TIMER: TimerState = {
  enabled: false,
  durationMinutes: 30,
  startedAt: null,
  endsAt: null,
};

export async function getTimerState(): Promise<TimerState> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.TIMER);
  if (!raw) return { ...DEFAULT_TIMER };
  try {
    return JSON.parse(raw) as TimerState;
  } catch {
    return { ...DEFAULT_TIMER };
  }
}

export async function setTimer(durationMinutes: number): Promise<TimerState> {
  const now = Date.now();
  const state: TimerState = {
    enabled: true,
    durationMinutes,
    startedAt: now,
    endsAt: now + durationMinutes * 60 * 1000,
  };
  await LocalStorage.setItem(STORAGE_KEYS.TIMER, JSON.stringify(state));
  return state;
}

export async function clearTimer(): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.TIMER, JSON.stringify(DEFAULT_TIMER));
}

export async function checkTimer(): Promise<{
  active: boolean;
  expired: boolean;
  remainingMs: number;
  remainingFormatted: string;
}> {
  const timer = await getTimerState();

  if (!timer.enabled || !timer.endsAt) {
    return { active: false, expired: false, remainingMs: 0, remainingFormatted: "" };
  }

  const remaining = timer.endsAt - Date.now();

  if (remaining <= 0) {
    return { active: true, expired: true, remainingMs: 0, remainingFormatted: "0:00" };
  }

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return { active: true, expired: false, remainingMs: remaining, remainingFormatted: formatted };
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
