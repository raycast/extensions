import { randomUUID } from "node:crypto";

import { LocalStorage } from "@raycast/api";

const LEGACY_HISTORY_KEY = "walk-history";
const HISTORY_GENERATION_KEY = "walk-history-generation";
const HISTORY_ENTRY_PREFIX = "walk-history-entry:";
const LEGACY_GENERATION = "legacy";
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

interface StoredWalkHistoryEntry extends WalkHistoryEntry {
  generation: string;
}

function isStoredWalkHistoryEntry(value: unknown): value is StoredWalkHistoryEntry {
  return (
    isWalkHistoryEntry(value) &&
    "generation" in value &&
    typeof (value as Partial<StoredWalkHistoryEntry>).generation === "string"
  );
}

function parseJson(value: LocalStorage.Value | undefined) {
  if (typeof value !== "string") return undefined;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

async function getHistoryGeneration() {
  return (await LocalStorage.getItem<string>(HISTORY_GENERATION_KEY)) ?? LEGACY_GENERATION;
}

function historyForGeneration(items: Record<string, LocalStorage.Value>, generation: string) {
  const entries: WalkHistoryEntry[] = Object.entries(items)
    .filter(([key]) => key.startsWith(HISTORY_ENTRY_PREFIX))
    .map(([, value]) => parseJson(value))
    .filter(isStoredWalkHistoryEntry)
    .filter((entry) => entry.generation === generation);

  if (generation === LEGACY_GENERATION) {
    const legacyHistory = parseJson(items[LEGACY_HISTORY_KEY]);
    if (Array.isArray(legacyHistory)) entries.push(...legacyHistory.filter(isWalkHistoryEntry));
  }

  return [...new Map(entries.map((entry) => [entry.id, entry])).values()].sort(
    (first, second) => Date.parse(second.walkedAt) - Date.parse(first.walkedAt),
  );
}

async function trimHistory(generation: string) {
  const items = await LocalStorage.allItems();
  if ((await getHistoryGeneration()) !== generation) return;

  const staleEntries = historyForGeneration(items, generation).slice(MAX_HISTORY_ENTRIES);
  await Promise.all(staleEntries.map((entry) => LocalStorage.removeItem(`${HISTORY_ENTRY_PREFIX}${entry.id}`)));
}

export async function getWalkHistory() {
  for (let attempt = 0; attempt < 3; attempt++) {
    const generation = await getHistoryGeneration();
    const items = await LocalStorage.allItems();

    if ((await getHistoryGeneration()) === generation) {
      return historyForGeneration(items, generation).slice(0, MAX_HISTORY_ENTRIES);
    }
  }

  return [];
}

export async function recordWalk(url: string) {
  const generation = await getHistoryGeneration();
  const entry: WalkHistoryEntry = {
    id: randomUUID(),
    url,
    walkedAt: new Date().toISOString(),
  };
  const storageKey = `${HISTORY_ENTRY_PREFIX}${entry.id}`;

  await LocalStorage.setItem(storageKey, JSON.stringify({ ...entry, generation } satisfies StoredWalkHistoryEntry));

  if ((await getHistoryGeneration()) !== generation) {
    await LocalStorage.removeItem(storageKey);
    return undefined;
  }

  await trimHistory(generation);
  return entry;
}

export async function clearWalkHistory() {
  const generation = randomUUID();
  await LocalStorage.setItem(HISTORY_GENERATION_KEY, generation);

  const items = await LocalStorage.allItems();
  if ((await getHistoryGeneration()) !== generation) return;

  const staleKeys = Object.entries(items)
    .filter(([key, value]) => {
      if (key === LEGACY_HISTORY_KEY) return true;
      if (!key.startsWith(HISTORY_ENTRY_PREFIX)) return false;
      const entry = parseJson(value);
      return !isStoredWalkHistoryEntry(entry) || entry.generation !== generation;
    })
    .map(([key]) => key);

  await Promise.all(staleKeys.map((key) => LocalStorage.removeItem(key)));
}
