import { LocalStorage } from "@raycast/api";
import { Task } from "./types";

const CACHE_KEY = "tasknotes_tasks";
const CACHE_TIMESTAMP_KEY = "tasknotes_tasks_timestamp";
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getCachedTasks(): Promise<Task[] | null> {
  const cached = await LocalStorage.getItem<string>(CACHE_KEY);
  if (!cached) {
    return null;
  }
  try {
    return JSON.parse(cached) as Task[];
  } catch {
    return null;
  }
}

export async function setCachedTasks(tasks: Task[]): Promise<void> {
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(tasks));
  await LocalStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
}

export async function isCacheValid(): Promise<boolean> {
  const timestamp = await LocalStorage.getItem<string>(CACHE_TIMESTAMP_KEY);
  if (!timestamp) {
    return false;
  }
  const cachedTime = parseInt(timestamp, 10);
  if (isNaN(cachedTime)) {
    return false;
  }
  return Date.now() - cachedTime < CACHE_TTL_MS;
}

export async function clearCache(): Promise<void> {
  await LocalStorage.removeItem(CACHE_KEY);
  await LocalStorage.removeItem(CACHE_TIMESTAMP_KEY);
}
