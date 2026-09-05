export interface CatalogHistorySnapshot {
  favoriteIds: string[];
  recentIds: string[];
}

interface CatalogHistoryStoreOptions {
  readFavorites: () => Promise<string[]>;
  readRecents: () => Promise<string[]>;
  writeFavorites: (ids: string[]) => Promise<void>;
  writeRecents: (ids: string[]) => Promise<void>;
  recentLimit?: number;
}

export interface CatalogHistoryStore {
  getSnapshot: () => CatalogHistorySnapshot;
  subscribe: (listener: () => void) => () => void;
  hydrate: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<boolean>;
  recordRecent: (id: string) => Promise<void>;
}

export function createCatalogHistoryStore({
  readFavorites,
  readRecents,
  writeFavorites,
  writeRecents,
  recentLimit = 8,
}: CatalogHistoryStoreOptions): CatalogHistoryStore {
  let snapshot: CatalogHistorySnapshot = { favoriteIds: [], recentIds: [] };
  let persistedFavoriteIds: string[] = [];
  let persistedRecentIds: string[] = [];
  let hydrationPromise: Promise<void> | undefined;
  let favoriteWrite = Promise.resolve();
  let recentWrite = Promise.resolve();
  const listeners = new Set<() => void>();

  const updateSnapshot = (nextSnapshot: CatalogHistorySnapshot) => {
    snapshot = nextSnapshot;
    listeners.forEach((listener) => listener());
  };

  const hydrate = () => {
    hydrationPromise ??= Promise.all([readFavorites(), readRecents()])
      .then(([favoriteIds, recentIds]) => {
        persistedFavoriteIds = favoriteIds;
        persistedRecentIds = recentIds;
        updateSnapshot({ favoriteIds, recentIds });
      })
      .catch((error) => {
        hydrationPromise = undefined;
        throw error;
      });
    return hydrationPromise;
  };

  const toggleFavorite = async (id: string) => {
    await hydrate();
    const added = !snapshot.favoriteIds.includes(id);
    const favoriteIds = added
      ? [id, ...snapshot.favoriteIds]
      : snapshot.favoriteIds.filter((favoriteId) => favoriteId !== id);
    updateSnapshot({ ...snapshot, favoriteIds });
    favoriteWrite = favoriteWrite
      .catch(() => undefined)
      .then(async () => {
        await writeFavorites(favoriteIds);
        persistedFavoriteIds = favoriteIds;
      });
    try {
      await favoriteWrite;
    } catch (error) {
      if (snapshot.favoriteIds === favoriteIds) updateSnapshot({ ...snapshot, favoriteIds: persistedFavoriteIds });
      throw error;
    }
    return added;
  };

  const recordRecent = async (id: string) => {
    await hydrate();
    const recentIds = [id, ...snapshot.recentIds.filter((recentId) => recentId !== id)].slice(0, recentLimit);
    updateSnapshot({ ...snapshot, recentIds });
    recentWrite = recentWrite
      .catch(() => undefined)
      .then(async () => {
        await writeRecents(recentIds);
        persistedRecentIds = recentIds;
      });
    try {
      await recentWrite;
    } catch (error) {
      if (snapshot.recentIds === recentIds) updateSnapshot({ ...snapshot, recentIds: persistedRecentIds });
      throw error;
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    hydrate,
    toggleFavorite,
    recordRecent,
  };
}
