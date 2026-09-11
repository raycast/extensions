import { LocalStorage } from "@raycast/api";
import { STORAGE_KEY, MAX_RECENT_PATHS } from "./constants";

export async function getRecentPaths(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function addRecentPath(path: string): Promise<string[]> {
  const paths = await getRecentPaths();
  const updated = [path, ...paths.filter((p) => p !== path)].slice(0, MAX_RECENT_PATHS);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function removeRecentPath(path: string): Promise<string[]> {
  const paths = await getRecentPaths();
  const updated = paths.filter((p) => p !== path);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
