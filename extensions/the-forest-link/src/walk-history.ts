import { randomUUID } from "node:crypto";

import { LocalStorage } from "@raycast/api";

const HISTORY_KEY = "walk-history";
const MAX_HISTORY_ENTRIES = 100;

export interface WalkHistoryEntry {
  id: string;
  url: string;
  walkedAt: string;
}

function isWalkHistoryEntry(value: unknown): value is WalkHistoryEntry {
  if (!value || typeof value !== "object") return false;

  const entry = value as Partial<WalkHistoryEntry>;
  return typeof entry.id === "string" && typeof entry.url === "string" && typeof entry.walkedAt === "string";
}

export async function getWalkHistory() {
  const storedHistory = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!storedHistory) return [];

  try {
    const history: unknown = JSON.parse(storedHistory);
    return Array.isArray(history) ? history.filter(isWalkHistoryEntry) : [];
  } catch {
    return [];
  }
}

export async function recordWalk(url: string) {
  const history = await getWalkHistory();
  const entry: WalkHistoryEntry = {
    id: randomUUID(),
    url,
    walkedAt: new Date().toISOString(),
  };

  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...history].slice(0, MAX_HISTORY_ENTRIES)));
  return entry;
}

export async function clearWalkHistory() {
  await LocalStorage.removeItem(HISTORY_KEY);
}
