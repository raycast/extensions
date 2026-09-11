import { LocalStorage } from "@raycast/api";
import { GenerationRecord } from "./types";

const HISTORY_KEY = "generation-history";
const FAVORITE_MODELS_KEY = "favorite-models";
const RECENT_MODELS_KEY = "recent-models";
const MAX_RECORDS = 100;
const MAX_RECENT_MODELS = 12;

export async function getHistory(): Promise<GenerationRecord[]> {
  const serialized = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!serialized) return [];
  try {
    const records = JSON.parse(serialized);
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

export async function saveHistory(records: GenerationRecord[]) {
  await LocalStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(records.slice(0, MAX_RECORDS)),
  );
}

export async function upsertRecord(record: GenerationRecord) {
  const records = await getHistory();
  const next = [record, ...records.filter((entry) => entry.id !== record.id)];
  await saveHistory(next);
  await addRecentModel(record.endpointId);
}

export async function updateRecord(
  id: string,
  updater: (record: GenerationRecord) => GenerationRecord,
) {
  const records = await getHistory();
  const next = records.map((record) =>
    record.id === id ? updater(record) : record,
  );
  await saveHistory(next);
  return next.find((record) => record.id === id);
}

export async function deleteRecord(id: string) {
  const records = await getHistory();
  await saveHistory(records.filter((record) => record.id !== id));
}

export async function clearHistory() {
  await LocalStorage.removeItem(HISTORY_KEY);
}

export async function getFavoriteModels(): Promise<string[]> {
  return getStringArray(FAVORITE_MODELS_KEY);
}

export async function toggleFavoriteModel(endpointId: string) {
  const favorites = await getFavoriteModels();
  const next = favorites.includes(endpointId)
    ? favorites.filter((entry) => entry !== endpointId)
    : [endpointId, ...favorites];
  await LocalStorage.setItem(FAVORITE_MODELS_KEY, JSON.stringify(next));
  return next;
}

export async function getRecentModels(): Promise<string[]> {
  return getStringArray(RECENT_MODELS_KEY);
}

export async function addRecentModel(endpointId: string) {
  const recent = await getRecentModels();
  const next = [endpointId, ...recent.filter((entry) => entry !== endpointId)];
  await LocalStorage.setItem(
    RECENT_MODELS_KEY,
    JSON.stringify(next.slice(0, MAX_RECENT_MODELS)),
  );
}

async function getStringArray(key: string): Promise<string[]> {
  const serialized = await LocalStorage.getItem<string>(key);
  if (!serialized) return [];

  try {
    const parsed = JSON.parse(serialized);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}
