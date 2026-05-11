import { LocalStorage } from "@raycast/api";
import { fileExists } from "./utils";

type StorageItem = {
  file: string;
  timestamp: number;
};

const STORAGE_KEY = "videos-history";
const OLDER_THAN = 1000 * 60 * 60 * 24 * 7; // 1 week

function isNotTooOld({ timestamp }: StorageItem) {
  return Date.now() - timestamp < OLDER_THAN;
}

export async function saveHistoryToStorage(files: string[]) {
  const items: StorageItem[] = files.map((file) => ({ file, timestamp: Date.now() }));
  return LocalStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function getHistoryFromStorage(): Promise<string[] | null> {
  const items = await LocalStorage.getItem(STORAGE_KEY);
  if (!items) return null;
  if (typeof items !== "string") return null;

  const parsedItems: StorageItem[] = JSON.parse(items);
  return parsedItems
    .filter(isNotTooOld)
    .map((item) => item.file)
    .filter(fileExists);
}

export async function removeFromHistoryStorage(file: string) {
  const items = await LocalStorage.getItem(STORAGE_KEY);
  if (!items) return;
  if (typeof items !== "string") return null;

  const parsedItems: StorageItem[] = JSON.parse(items);

  const newItems = parsedItems.filter((item) => item.file !== file);
  return LocalStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
}
