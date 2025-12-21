import { LocalStorage } from "@raycast/api";
import { Collection, Environment, RequestHistory, StorageData } from "./types";

const STORAGE_KEYS = {
  COLLECTIONS: "collections",
  HISTORY: "history",
  ENVIRONMENTS: "environments",
};

export async function getCollections(): Promise<Collection[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEYS.COLLECTIONS);
  return data ? JSON.parse(data) : [];
}

export async function saveCollections(
  collections: Collection[],
): Promise<void> {
  await LocalStorage.setItem(
    STORAGE_KEYS.COLLECTIONS,
    JSON.stringify(collections),
  );
}

export async function getHistory(): Promise<RequestHistory[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEYS.HISTORY);
  return data ? JSON.parse(data) : [];
}

export async function saveHistory(history: RequestHistory[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

export async function addToHistory(
  item: RequestHistory,
  maxItems = 50,
): Promise<void> {
  const history = await getHistory();
  const newHistory = [item, ...history].slice(0, maxItems);
  await saveHistory(newHistory);
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
}

export async function getEnvironments(): Promise<Environment[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEYS.ENVIRONMENTS);
  return data ? JSON.parse(data) : [];
}

export async function saveEnvironments(
  environments: Environment[],
): Promise<void> {
  await LocalStorage.setItem(
    STORAGE_KEYS.ENVIRONMENTS,
    JSON.stringify(environments),
  );
}

export async function getActiveEnvironment(): Promise<Environment | null> {
  const environments = await getEnvironments();
  return environments.find((env) => env.isActive) || null;
}

export async function exportData(): Promise<StorageData> {
  const collections = await getCollections();
  const history = await getHistory();
  const environments = await getEnvironments();
  return { collections, history, environments };
}

export async function importData(data: Partial<StorageData>): Promise<void> {
  if (data.collections) {
    await saveCollections(data.collections);
  }
  if (data.history) {
    await saveHistory(data.history);
  }
  if (data.environments) {
    await saveEnvironments(data.environments);
  }
}
