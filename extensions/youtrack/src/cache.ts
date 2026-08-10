import { LocalStorage } from "@raycast/api";

type YT_CACHE_KEY =
  | "youtrack-issues"
  | "youtrack-projects"
  | "youtrack-favorite-projects"
  | "youtrack-users"
  | "youtrack-self-user";

export async function saveCache<T>(objectKey: YT_CACHE_KEY, objects: T[]): Promise<void> {
  await LocalStorage.setItem(objectKey, JSON.stringify(objects));
}

export async function loadCache<T>(objectKey: YT_CACHE_KEY): Promise<T[]> {
  const data = (await LocalStorage.getItem(objectKey)) as string;
  return JSON.parse(data ?? "[]") as T[];
}
