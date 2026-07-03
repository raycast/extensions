// Per-command settings persistence over Raycast's LocalStorage. Each command
// (operation + language) gets its own key, so "Format CSS" and "Format SQL"
// remember independent settings. Loading merges the stored value over the
// defaults, so options added in a later version pick up their default rather
// than coming back `undefined` for users with an older stored blob.

import { LocalStorage } from "@raycast/api";
import type { Language, Operation } from "./languages";

export function settingsKey(operation: Operation, language: Language): string {
  return `settings:${operation}:${language}`;
}

export async function loadSettings<T extends object>(key: string, defaults: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return defaults;
  try {
    return { ...defaults, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return defaults; // corrupt/legacy value — fall back to defaults
  }
}

export async function saveSettings<T extends object>(key: string, value: T): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(value));
}
