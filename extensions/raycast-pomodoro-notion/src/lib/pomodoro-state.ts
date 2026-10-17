import { LocalStorage } from "@raycast/api";

export * from "./pomodoro-machine";

import { stopLoopingAudio } from "./audio";
import type { PomodoroSession } from "./pomodoro-machine";

const STORAGE_KEY = "active-pomodoro-session";

export async function loadSession(): Promise<PomodoroSession | null> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PomodoroSession;
  } catch {
    await LocalStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export async function saveSession(session: PomodoroSession): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
  await stopLoopingAudio();
}
