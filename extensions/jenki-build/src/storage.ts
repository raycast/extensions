import { LocalStorage } from "@raycast/api";
import { BuildHistoryEntry } from "./types";

const KEYS = {
  favorites: "jenkins-ext:favorites",
  recentJobs: "jenkins-ext:recent-jobs",
  buildHistory: "jenkins-ext:build-history",
} as const;

// --- Favorites (string[], max 50) ---

export async function getFavorites(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(KEYS.favorites);
  if (!raw) return [];
  return JSON.parse(raw) as string[];
}

export async function setFavorites(paths: string[]): Promise<void> {
  const capped = paths.slice(0, 50);
  await LocalStorage.setItem(KEYS.favorites, JSON.stringify(capped));
}

export async function addFavorite(path: string): Promise<void> {
  const current = await getFavorites();
  const deduped = [path, ...current.filter((p) => p !== path)].slice(0, 50);
  await LocalStorage.setItem(KEYS.favorites, JSON.stringify(deduped));
}

export async function removeFavorite(path: string): Promise<void> {
  const current = await getFavorites();
  const filtered = current.filter((p) => p !== path);
  await LocalStorage.setItem(KEYS.favorites, JSON.stringify(filtered));
}

// --- Recent Jobs (string[], max 10, LRU) ---

export async function getRecentJobs(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(KEYS.recentJobs);
  if (!raw) return [];
  return JSON.parse(raw) as string[];
}

export async function pushRecentJob(jobPath: string): Promise<void> {
  const current = await getRecentJobs();
  const deduped = [jobPath, ...current.filter((p) => p !== jobPath)].slice(
    0,
    10,
  );
  await LocalStorage.setItem(KEYS.recentJobs, JSON.stringify(deduped));
}

// --- Build History (BuildHistoryEntry[], max 20, LRU) ---

export async function getBuildHistory(): Promise<BuildHistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(KEYS.buildHistory);
  if (!raw) return [];
  return JSON.parse(raw) as BuildHistoryEntry[];
}

export async function pushBuildHistory(
  entry: BuildHistoryEntry,
): Promise<void> {
  const current = await getBuildHistory();
  const updated = [entry, ...current].slice(0, 20);
  await LocalStorage.setItem(KEYS.buildHistory, JSON.stringify(updated));
}
