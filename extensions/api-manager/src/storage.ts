import { LocalStorage } from "@raycast/api";
import { ApiEntry, STORAGE_KEY } from "./types";

export async function loadEntries(): Promise<ApiEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ApiEntry[];
  } catch {
    return [];
  }
}

export async function saveEntries(entries: ApiEntry[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function addEntry(entry: ApiEntry): Promise<void> {
  const entries = await loadEntries();
  entries.unshift(entry);
  await saveEntries(entries);
}

export async function updateEntry(updated: ApiEntry): Promise<void> {
  const entries = await loadEntries();
  const idx = entries.findIndex((e) => e.id === updated.id);
  if (idx !== -1) {
    entries[idx] = updated;
    await saveEntries(entries);
  }
}

export async function deleteEntry(id: string): Promise<void> {
  const entries = await loadEntries();
  await saveEntries(entries.filter((e) => e.id !== id));
}
