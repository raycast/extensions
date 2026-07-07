import { LocalStorage } from "@raycast/api";

const RECENT_QUERIES_KEY = "arena-recent-queries";
const SAVED_QUERIES_KEY = "arena-saved-queries";
const MAX_RECENT = 12;

async function readList(key: string): Promise<string[]> {
  const value = await LocalStorage.getItem<string>(key);
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    return [];
  }
  return [];
}

async function writeList(key: string, value: string[]): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(value));
}

export async function addRecentQuery(query: string): Promise<void> {
  const normalized = query.trim();
  if (!normalized) {
    return;
  }
  const current = await readList(RECENT_QUERIES_KEY);
  const next = [normalized, ...current.filter((item) => item !== normalized)].slice(0, MAX_RECENT);
  await writeList(RECENT_QUERIES_KEY, next);
}

export async function getRecentQueries(): Promise<string[]> {
  return readList(RECENT_QUERIES_KEY);
}

export async function getSavedQueries(): Promise<string[]> {
  return readList(SAVED_QUERIES_KEY);
}

export async function toggleSavedQuery(query: string): Promise<boolean> {
  const normalized = query.trim();
  if (!normalized) {
    return false;
  }
  const current = await readList(SAVED_QUERIES_KEY);
  const exists = current.includes(normalized);
  const next = exists ? current.filter((item) => item !== normalized) : [normalized, ...current];
  await writeList(SAVED_QUERIES_KEY, next);
  return !exists;
}
