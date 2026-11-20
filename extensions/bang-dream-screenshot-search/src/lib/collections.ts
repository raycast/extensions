import { LocalStorage } from "@raycast/api";
import { RECENT_LIMIT, addRecentId, decodeStoredIds, sanitizeStoredIds } from "./collection-logic";

export { addRecentId, RECENT_LIMIT, sanitizeStoredIds, toggleFavoriteId } from "./collection-logic";

export const FAVORITES_STORAGE_KEY = "favorites.v1";
export const RECENT_STORAGE_KEY = "recent.v1";
let recentMutationQueue: Promise<void> = Promise.resolve();

async function persistIds(key: string, ids: string[]): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(ids));
}

function enqueueRecentMutation<T>(mutation: () => Promise<T>): Promise<T> {
  const result = recentMutationQueue.then(mutation);
  recentMutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function loadCollections(validIds: ReadonlySet<string>): Promise<{
  favoriteIds: string[];
  recentIds: string[];
}> {
  const [favoriteValue, recentValue] = await Promise.all([
    LocalStorage.getItem(FAVORITES_STORAGE_KEY),
    LocalStorage.getItem(RECENT_STORAGE_KEY),
  ]);
  const decodedFavoriteIds = decodeStoredIds(favoriteValue);
  const decodedRecentIds = decodeStoredIds(recentValue);
  const favoriteIds = sanitizeStoredIds(decodedFavoriteIds, validIds);
  const recentIds = sanitizeStoredIds(decodedRecentIds, validIds, RECENT_LIMIT);

  const writes: Promise<void>[] = [];
  if (favoriteValue !== JSON.stringify(favoriteIds)) {
    writes.push(persistIds(FAVORITES_STORAGE_KEY, favoriteIds));
  }
  if (recentValue !== JSON.stringify(recentIds)) {
    writes.push(persistIds(RECENT_STORAGE_KEY, recentIds));
  }
  await Promise.all(writes);
  return { favoriteIds, recentIds };
}

export async function saveFavoriteIds(ids: string[]): Promise<void> {
  await persistIds(FAVORITES_STORAGE_KEY, ids);
}

export function addRecentIdAndSave(id: string, validIds: ReadonlySet<string>): Promise<string[]> {
  return enqueueRecentMutation(async () => {
    const storedValue = await LocalStorage.getItem(RECENT_STORAGE_KEY);
    const currentIds = sanitizeStoredIds(decodeStoredIds(storedValue), validIds, RECENT_LIMIT);
    const nextIds = addRecentId(currentIds, id);
    await persistIds(RECENT_STORAGE_KEY, nextIds);
    return nextIds;
  });
}

export function clearRecentIds(): Promise<void> {
  return enqueueRecentMutation(() => LocalStorage.removeItem(RECENT_STORAGE_KEY));
}
