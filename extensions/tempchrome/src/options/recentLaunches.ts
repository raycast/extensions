import { LocalStorage } from "@raycast/api";

import type { LaunchOptionsValues } from "./schema";

const STORAGE_KEY = "tempchrome:recentLaunches";
const MAX_ENTRIES = 5;

export async function loadRecent(): Promise<LaunchOptionsValues[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_ENTRIES) as LaunchOptionsValues[];
  } catch {
    return [];
  }
}

export async function pushRecent(values: LaunchOptionsValues): Promise<void> {
  const current = await loadRecent();
  const filtered = current.filter((entry) => !valuesEqual(entry, values));
  const next = [values, ...filtered].slice(0, MAX_ENTRIES);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function clearRecent(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

export async function removeRecent(index: number): Promise<LaunchOptionsValues[]> {
  const current = await loadRecent();
  if (index < 0 || index >= current.length) return current;
  const next = current.filter((_, position) => position !== index);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

function valuesEqual(a: LaunchOptionsValues, b: LaunchOptionsValues): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
