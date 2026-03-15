import { LocalStorage } from "@raycast/api";
import { CacheIndex, DictionaryEntry } from "../types";

const CACHE_PREFIX = "dict:";
const INDEX_KEY = "dict:index";

function cacheKey(word: string): string {
  return `${CACHE_PREFIX}${word.toLowerCase().trim()}`;
}

export async function getCached(word: string): Promise<DictionaryEntry | null> {
  const raw = await LocalStorage.getItem<string>(cacheKey(word));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DictionaryEntry;
  } catch {
    return null;
  }
}

export async function setCached(entry: DictionaryEntry): Promise<void> {
  const key = cacheKey(entry.word);
  await LocalStorage.setItem(key, JSON.stringify(entry));

  const raw = await LocalStorage.getItem<string>(INDEX_KEY);
  const index: CacheIndex = raw ? JSON.parse(raw) : { words: [] };
  const normalized = entry.word.toLowerCase().trim();
  index.words = [normalized, ...index.words.filter((w) => w !== normalized)];
  await LocalStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export async function getHistory(): Promise<DictionaryEntry[]> {
  const raw = await LocalStorage.getItem<string>(INDEX_KEY);
  if (!raw) return [];
  const index: CacheIndex = JSON.parse(raw);
  const entries = await Promise.all(index.words.map((w) => getCached(w)));
  return entries.filter((e): e is DictionaryEntry => e !== null);
}

export async function removeFromHistory(word: string): Promise<void> {
  const normalized = word.toLowerCase().trim();
  await LocalStorage.removeItem(cacheKey(normalized));

  const raw = await LocalStorage.getItem<string>(INDEX_KEY);
  if (!raw) return;
  const index: CacheIndex = JSON.parse(raw);
  index.words = index.words.filter((w) => w !== normalized);
  await LocalStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export async function clearHistory(): Promise<void> {
  const raw = await LocalStorage.getItem<string>(INDEX_KEY);
  if (!raw) return;
  const index: CacheIndex = JSON.parse(raw);
  await Promise.all(index.words.map((w) => LocalStorage.removeItem(cacheKey(w))));
  await LocalStorage.removeItem(INDEX_KEY);
}
