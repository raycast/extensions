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
    const previousFavoriteIds = snapshot.favoriteIds;
    const added = !snapshot.favoriteIds.includes(id);
    const favoriteIds = added
      ? [id, ...snapshot.favoriteIds]
      : snapshot.favoriteIds.filter((favoriteId) => favoriteId !== id);
    updateSnapshot({ ...snapshot, favoriteIds });
    favoriteWrite = favoriteWrite.catch(() => undefined).then(() => writeFavorites(favoriteIds));
    try {
      await favoriteWrite;
    } catch (error) {
      if (snapshot.favoriteIds === favoriteIds) updateSnapshot({ ...snapshot, favoriteIds: previousFavoriteIds });
      throw error;
    }
    return added;
  };

  const recordRecent = async (id: string) => {
    await hydrate();
    const previousRecentIds = snapshot.recentIds;
    const recentIds = [id, ...snapshot.recentIds.filter((recentId) => recentId !== id)].slice(0, recentLimit);
    updateSnapshot({ ...snapshot, recentIds });
    recentWrite = recentWrite.catch(() => undefined).then(() => writeRecents(recentIds));
    try {
      await recentWrite;
    } catch (error) {
      if (snapshot.recentIds === recentIds) updateSnapshot({ ...snapshot, recentIds: previousRecentIds });
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
