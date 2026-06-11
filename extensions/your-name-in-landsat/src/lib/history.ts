import { LocalStorage } from "@raycast/api";
import * as fs from "fs/promises";

const KEY = "landsat-history";
const MAX_ENTRIES = 100;

export type HistoryEntry = {
  id: string;
  name: string;
  filePath: string;
  exportFilePath: string;
  tileIds: string[];
  createdAt: number;
};

export async function readHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeHistory(entries: HistoryEntry[]): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(entries));
}

function filesOf(entry: HistoryEntry): string[] {
  return [entry.filePath, entry.exportFilePath];
}

export async function pushHistory(entry: Omit<HistoryEntry, "id" | "createdAt">): Promise<HistoryEntry> {
  const full: HistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  const entries = await readHistory();
  entries.unshift(full);
  const trimmed = entries.slice(0, MAX_ENTRIES);
  const removed = entries.slice(MAX_ENTRIES);
  await writeHistory(trimmed);
  await Promise.all(removed.flatMap(filesOf).map(safeUnlink));
  return full;
}

export async function removeHistory(id: string): Promise<void> {
  const entries = await readHistory();
  const target = entries.find((e) => e.id === id);
  const next = entries.filter((e) => e.id !== id);
  await writeHistory(next);
  if (target) await Promise.all(filesOf(target).map(safeUnlink));
}

export async function clearAllHistory(): Promise<void> {
  const entries = await readHistory();
  await writeHistory([]);
  await Promise.all(entries.flatMap(filesOf).map(safeUnlink));
}

async function safeUnlink(p: string): Promise<void> {
  try {
    await fs.unlink(p);
  } catch {
    // ignore
  }
}
