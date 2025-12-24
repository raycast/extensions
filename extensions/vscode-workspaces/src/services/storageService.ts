import { LocalStorage } from "@raycast/api";
import type { WorkspaceMetadata, SortOption } from "../types";

// ----------------------------------------------
// STORAGE KEYS
// ----------------------------------------------

const FAVORITES_KEY = "workspace-favorites";
const LAST_OPENED_KEY = "workspace-last-opened";
const TAGS_KEY = "workspace-tags";
const SORT_PREFERENCE_KEY = "sort-preference";

// ----------------------------------------------
// FAVORITES
// ----------------------------------------------

export async function getFavorites(): Promise<Set<string>> {
  const data = await LocalStorage.getItem<string>(FAVORITES_KEY);
  if (!data) return new Set();
  try {
    return new Set(JSON.parse(data));
  } catch {
    return new Set();
  }
}

export async function toggleFavorite(workspaceId: string): Promise<boolean> {
  const favorites = await getFavorites();
  const isFavorite = favorites.has(workspaceId);

  if (isFavorite) {
    favorites.delete(workspaceId);
  } else {
    favorites.add(workspaceId);
  }

  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  return !isFavorite; // return new state
}

export async function isFavorite(workspaceId: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.has(workspaceId);
}

// ----------------------------------------------
// RECENTLY OPENED
// ----------------------------------------------

export async function getLastOpenedTimestamps(): Promise<Record<string, number>> {
  const data = await LocalStorage.getItem<string>(LAST_OPENED_KEY);
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function updateLastOpened(workspaceId: string): Promise<void> {
  const timestamps = await getLastOpenedTimestamps();
  timestamps[workspaceId] = Date.now();
  await LocalStorage.setItem(LAST_OPENED_KEY, JSON.stringify(timestamps));
}

export async function getLastOpened(workspaceId: string): Promise<number | undefined> {
  const timestamps = await getLastOpenedTimestamps();
  return timestamps[workspaceId];
}

// ----------------------------------------------
// TAGS
// ----------------------------------------------

export async function getWorkspaceTags(): Promise<Record<string, string[]>> {
  const data = await LocalStorage.getItem<string>(TAGS_KEY);
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function setWorkspaceTags(workspaceId: string, tags: string[]): Promise<void> {
  const allTags = await getWorkspaceTags();
  if (tags.length === 0) {
    delete allTags[workspaceId];
  } else {
    allTags[workspaceId] = tags;
  }
  await LocalStorage.setItem(TAGS_KEY, JSON.stringify(allTags));
}

export async function getTags(workspaceId: string): Promise<string[]> {
  const allTags = await getWorkspaceTags();
  return allTags[workspaceId] || [];
}

// ----------------------------------------------
// PREFERENCES
// ----------------------------------------------

export async function getSortPreference(): Promise<SortOption> {
  const pref = await LocalStorage.getItem<string>(SORT_PREFERENCE_KEY);
  if (!pref) return "alphabetical";
  return pref as SortOption;
}

export async function setSortPreference(sortOption: SortOption): Promise<void> {
  await LocalStorage.setItem(SORT_PREFERENCE_KEY, sortOption);
}

// ----------------------------------------------
// METADATA AGGREGATION
// ----------------------------------------------

export async function getWorkspaceMetadata(workspaceId: string): Promise<WorkspaceMetadata> {
  const [favorite, lastOpened, tags] = await Promise.all([
    isFavorite(workspaceId),
    getLastOpened(workspaceId),
    getTags(workspaceId),
  ]);

  return {
    isFavorite: favorite,
    lastOpened,
    tags,
  };
}

export async function getAllWorkspaceMetadata(workspaceIds: string[]): Promise<Record<string, WorkspaceMetadata>> {
  const [favorites, timestamps, allTags] = await Promise.all([
    getFavorites(),
    getLastOpenedTimestamps(),
    getWorkspaceTags(),
  ]);

  const result: Record<string, WorkspaceMetadata> = {};

  for (const id of workspaceIds) {
    result[id] = {
      isFavorite: favorites.has(id),
      lastOpened: timestamps[id],
      tags: allTags[id] || [],
    };
  }

  return result;
}
