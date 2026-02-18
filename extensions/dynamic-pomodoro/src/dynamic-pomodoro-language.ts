declare function require(name: "@raycast/api"): typeof import("@raycast/api");

export type DynamicPomodoroLanguage = "en" | "ru";

export const DYNAMIC_POMODORO_LANGUAGE_KEY = "timer-dynamic-pomodoro-language-v1";

function isDynamicPomodoroLanguage(value: string): value is DynamicPomodoroLanguage {
  return value === "en" || value === "ru";
}

export async function getStoredDynamicPomodoroLanguage(): Promise<DynamicPomodoroLanguage | undefined> {
  try {
    const { LocalStorage } = require("@raycast/api");
    const raw = await LocalStorage.getItem<string>(DYNAMIC_POMODORO_LANGUAGE_KEY);
    if (!raw) {
      return undefined;
    }
    return isDynamicPomodoroLanguage(raw) ? raw : undefined;
  } catch {
    return undefined;
  }
}

export async function setStoredDynamicPomodoroLanguage(language: DynamicPomodoroLanguage): Promise<void> {
  try {
    const { LocalStorage } = require("@raycast/api");
    await LocalStorage.setItem(DYNAMIC_POMODORO_LANGUAGE_KEY, language);
  } catch {
    // Settings should never break main flow.
  }
}
