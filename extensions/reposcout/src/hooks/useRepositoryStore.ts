import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { environment } from "@raycast/api";
import { createFileIndexStore } from "../cache/index-store";
import { createFileUserDataStore } from "../cache/user-data-store";
import { indexFilePath, userDataFilePath } from "../cache/paths";
import {
  getUserData,
  recordOpen as recordOpenPure,
  toggleFavorite as toggleFavoritePure,
  togglePin as togglePinPure,
} from "../cache/user-data";
import { refreshIndex } from "../indexer/indexer";
import { loadPreferences } from "../preferences/preferences";
import { addRoots as addRootsPure, mergeRoots, removeRoot as removeRootPure } from "../preferences/roots";
import { loadStoredRoots, saveStoredRoots } from "../preferences/roots-store";
import type { IndexingProgress } from "../types/index-state";
import type { RepositoryRecord, RepositoryUserData } from "../types/repository";
import { createLogger } from "../utils/logger";

const log = createLogger("hook");

/** Reactive state exposed by {@link useRepositoryStore}. */
export interface RepositoryStoreState {
  readonly records: readonly RepositoryRecord[];
  readonly userData: ReadonlyMap<string, RepositoryUserData>;
  readonly isRefreshing: boolean;
  /** False until the initial cache + roots load completes. */
  readonly isReady: boolean;
  readonly progress: IndexingProgress | null;
  readonly error: string | null;
  /** Folders the user added inside the extension (removable). */
  readonly storedRoots: readonly string[];
  /** Folders coming from extension preferences (read-only here). */
  readonly preferenceRoots: readonly string[];
  /** The de-duplicated union actually scanned. */
  readonly effectiveRoots: readonly string[];
}

/** The hook's return value: current state plus imperative actions. */
export interface RepositoryStore extends RepositoryStoreState {
  /** Trigger a background index refresh (discovery + incremental enrichment). */
  refresh(): void;
  /** Record that the user opened a repository (updates recency/frequency). */
  recordOpen(path: string): Promise<void>;
  /** Toggle a repository's favorite flag. */
  toggleFavorite(path: string): Promise<void>;
  /** Toggle a repository's pinned flag. */
  togglePin(path: string): Promise<void>;
  /** Add folders (from the in-app picker) and re-index. */
  addRoots(paths: readonly string[]): Promise<void>;
  /** Remove an in-app–added folder and re-index. */
  removeRoot(path: string): Promise<void>;
}

/**
 * Loads the cached repository index instantly, then refreshes it in the
 * background, and exposes mutators for user data. The UI depends only on this
 * hook and never talks to the filesystem, git, or cache layers directly — this
 * is the single seam described in docs/ARCHITECTURE.md ("Extension lifecycle").
 */
export function useRepositoryStore(): RepositoryStore {
  const preferences = useMemo(() => loadPreferences(), []);
  const indexStore = useMemo(() => createFileIndexStore(indexFilePath(environment.supportPath)), []);
  const userDataStore = useMemo(() => createFileUserDataStore(userDataFilePath(environment.supportPath)), []);

  const preferenceRoots = useMemo(() => preferences.discovery.roots, [preferences.discovery.roots]);

  const [records, setRecords] = useState<readonly RepositoryRecord[]>([]);
  const [userData, setUserData] = useState<ReadonlyMap<string, RepositoryUserData>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState<IndexingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storedRoots, setStoredRoots] = useState<readonly string[]>([]);

  const mounted = useRef(true);
  const refreshing = useRef(false);
  // Set when refresh() is called mid-scan (e.g. the user just added a folder);
  // the in-flight scan re-runs on completion so new roots are always picked up.
  const pendingRefresh = useRef(false);
  // Keep a live ref to user data so persistence always sees the latest map even
  // when multiple mutations happen before React re-renders.
  const userDataRef = useRef<Map<string, RepositoryUserData>>(new Map());
  // Live ref to the in-app roots so refresh() can read the latest without being
  // re-created (which would re-run the mount effect).
  const storedRootsRef = useRef<string[]>([]);
  // Live ref to the latest refresh() so it can re-invoke itself from `finally`.
  const refreshRef = useRef<() => void>(() => {});

  const effectiveRoots = useMemo(() => mergeRoots(preferenceRoots, storedRoots), [preferenceRoots, storedRoots]);

  const persistUserData = useCallback(
    async (next: Map<string, RepositoryUserData>) => {
      userDataRef.current = next;
      if (mounted.current) {
        setUserData(new Map(next));
      }
      await userDataStore.save(next);
    },
    [userDataStore],
  );

  const refresh = useCallback(() => {
    // Effective roots = preference roots ∪ in-app roots. With none configured
    // there is nothing to scan; skip entirely so we never wipe an existing cache
    // or do pointless work. The UI shows a "pick folders" prompt then. See ADR-010.
    const roots = mergeRoots(preferences.discovery.roots, storedRootsRef.current);
    if (roots.length === 0) {
      return;
    }
    // A scan is already running. Remember to run once more when it finishes so a
    // just-added folder is never missed, then bail.
    if (refreshing.current) {
      pendingRefresh.current = true;
      return;
    }
    refreshing.current = true;
    setIsRefreshing(true);
    setError(null);

    void refreshIndex({
      discovery: { ...preferences.discovery, roots },
      store: indexStore,
      onProgress: (next) => {
        if (mounted.current) {
          setProgress(next);
        }
      },
    })
      .then((index) => {
        if (mounted.current) {
          setRecords(index.records);
        }
      })
      .catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : String(cause);
        log.error("index refresh failed", message);
        if (mounted.current) {
          setError(message);
        }
      })
      .finally(() => {
        refreshing.current = false;
        if (mounted.current) {
          setIsRefreshing(false);
        }
        // If roots changed mid-scan, run again with the latest roots.
        if (pendingRefresh.current) {
          pendingRefresh.current = false;
          refreshRef.current();
        }
      });
  }, [preferences.discovery, indexStore]);

  // Keep the ref pointing at the latest refresh so `finally` can re-invoke it.
  refreshRef.current = refresh;

  // Initial load: hydrate from cache instantly, then kick off a refresh.
  useEffect(() => {
    mounted.current = true;
    void (async () => {
      const [cachedIndex, cachedUserData, cachedRoots] = await Promise.all([
        indexStore.load(),
        userDataStore.load(),
        loadStoredRoots(),
      ]);
      if (!mounted.current) {
        return;
      }
      if (cachedIndex) {
        setRecords(cachedIndex.records);
      }
      userDataRef.current = cachedUserData;
      setUserData(new Map(cachedUserData));
      storedRootsRef.current = cachedRoots;
      setStoredRoots(cachedRoots);
      setIsReady(true);
      refresh();
    })();

    return () => {
      mounted.current = false;
    };
  }, [indexStore, userDataStore, refresh]);

  const applyStoredRoots = useCallback(
    async (next: string[]) => {
      storedRootsRef.current = next;
      if (mounted.current) {
        setStoredRoots(next);
      }
      await saveStoredRoots(next);
      refresh();
    },
    [refresh],
  );

  const addRoots = useCallback(
    (paths: readonly string[]) => applyStoredRoots(addRootsPure(storedRootsRef.current, paths)),
    [applyStoredRoots],
  );

  const removeRoot = useCallback(
    (path: string) => applyStoredRoots(removeRootPure(storedRootsRef.current, path)),
    [applyStoredRoots],
  );

  const mutate = useCallback(
    async (path: string, transform: (data: RepositoryUserData) => RepositoryUserData) => {
      const next = new Map(userDataRef.current);
      const current = getUserData(next, path);
      next.set(path, transform(current));
      await persistUserData(next);
    },
    [persistUserData],
  );

  const recordOpen = useCallback((path: string) => mutate(path, (data) => recordOpenPure(data, Date.now())), [mutate]);
  const toggleFavorite = useCallback((path: string) => mutate(path, (data) => toggleFavoritePure(data)), [mutate]);
  const togglePin = useCallback((path: string) => mutate(path, (data) => togglePinPure(data)), [mutate]);

  return {
    records,
    userData,
    isRefreshing,
    isReady,
    progress,
    error,
    storedRoots,
    preferenceRoots,
    effectiveRoots,
    refresh,
    recordOpen,
    toggleFavorite,
    togglePin,
    addRoots,
    removeRoot,
  };
}
