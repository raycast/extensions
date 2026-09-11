import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  closeMainWindow,
  environment,
  Toast,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import os from "node:os";
import path from "node:path";
import { setMaxListeners } from "node:events";
import { Entry, SortMode, VisitLog } from "../lib/types";
import { describeErased, eraseEverything } from "../lib/erase";
import {
  deriveProgress,
  describeProgress,
  isSettled,
  missingUsagePaths,
  statusLight,
} from "../lib/progress";
import {
  displayPath,
  normalizeDir,
  locationLabel,
  relativeDepth,
  sharedCloudFolders,
  splitPathQuery,
  statEntry,
} from "../lib/read-dir";
import { readUsageMetaResult, searchPathResult } from "../lib/spotlight";
import { isUnindexedScope, listUnder } from "../lib/walk";
import { loadShortcutIndex, saveShortcutIndex } from "../lib/shortcut-index";
import { scanShortcuts, Shortcut } from "../lib/drive-shortcuts";
import { loadSharedIndex, saveSharedIndex } from "../lib/shared-index";
import { loadDiscovered, rememberDiscovered } from "../lib/discovered";
import { dataGeneration } from "../lib/storage-lock";
import { scanSharedFolders } from "../lib/shared-scan";
import { driveIndexCaveat, shouldReplaceIndex } from "../lib/index-refresh";
import { readCachedUsage, writeCachedUsage } from "../lib/usage-cache";
import {
  clearVisits,
  loadPins,
  loadSearches,
  loadVisitLog,
  loadAbbreviations,
  recordAbbreviation,
  recordSearch,
  recordVisit,
  resetVisit,
  togglePin,
} from "../lib/store";
import { ScoreParts, coarseScore, scoreEntry, visitScore } from "../lib/score";
import {
  MATCH,
  hiddenOnly,
  matchPath,
  matchQuality,
  matchTier,
  dottedTerms,
  excludesDirectories,
  matchesStats,
  parseQuery,
  TypeFilter,
} from "../lib/query";
import { Row, RowHandlers } from "./row";
import { SetupActions } from "./setup-actions";
import { entryStoragePath, rowIdForEntry } from "../lib/entry-identity";
import { compactScopeLabel, relativeTime } from "../lib/format";
import { compareRankedEntries, RankedEntry } from "../lib/result-order";
import { displayRows } from "../lib/display-rows";
import {
  DirectorySnapshot,
  readDirectoryAsync,
} from "../lib/directory-listing";
import { useDirectoryListing } from "./use-directory-listing";
import { withIndexingLock } from "../lib/indexing-lock";
import { useRecentFiles } from "./use-recent-files";
import { SearchSetup, useSearchSetup } from "./use-search-setup";
import { useCachedEntries } from "./use-cached-entries";
import { useStandardPlaces } from "./use-standard-places";
import { useFolderSelection } from "./use-folder-selection";
import { FolderNavigation } from "../lib/folder-navigation";
import {
  NativeSearchNavigation,
  SearchFrame,
  NavigationActions as FrameActions,
} from "./native-search-navigation";
import { NavigationActions } from "./navigation-actions";
import { HiddenFilesAction } from "./hidden-files-action";
import { SearchHistoryActions } from "./search-history-actions";
import { SearchOptions } from "./search-options";
import { useEventHandles } from "./use-event-handles";
import {
  SearchScreen,
  SearchScreenContent,
  SearchScreenView,
} from "./search-screen";
import {
  enableNavigationDiagnostics,
  traceNavigation,
  traceNavigationAfterRelease,
} from "../lib/navigation-diagnostics";
import { validateRecentEntries } from "../lib/recent-validation";
import { createWorkQueue } from "../lib/work-queue";
import {
  LIVE_RESULTS,
  LIVE_RENDERED_RESULTS,
  LIVE_CANDIDATES,
  LIVE_DIRECTORIES,
} from "../lib/search-limits";

/** Minimum lengths for global discovery and scoped search history. */
const MIN_QUERY_GLOBAL = 3;
const MIN_QUERY_SCOPED = 2;
/** Limits overlapping Spotlight processes while typing. */
const DEBOUNCE_MS = 420;
/** How long a query must sit unchanged before it is remembered as history. */
const HISTORY_SETTLE_MS = 1500;

type Props = {
  /** Search scope; undefined searches all indexed locations. */
  dir?: string;
};

type Ranked = RankedEntry & { score: ScoreParts };

function BrowserView({
  dir: rawDir,
  initialSelectionPath,
  screen,
  onNavigate,
  onReturnToStart,
  navigation,
  frameId,
  setup,
  reloadKey,
  setReloadKey,
  includeHidden,
  onToggleHidden,
}: Props & {
  includeHidden: boolean;
  onToggleHidden: () => void;
  initialSelectionPath?: string;
  screen: SearchScreen;
  onReturnToStart: (fromId: number) => void;
  onNavigate: (
    fromId: number,
    target: string,
    selectedPath: string | undefined,
  ) => void;
  navigation: FolderNavigation;
  frameId: number;
  setup: SearchSetup;
  reloadKey: number;
  setReloadKey: Dispatch<SetStateAction<number>>;
}) {
  const dir = rawDir === undefined ? undefined : normalizeDir(rawDir);
  const prefs = getPreferenceValues<Preferences>();
  const event = useEventHandles();

  const searchText = useSyncExternalStore(
    screen.subscribe,
    screen.getSearchText,
  );
  const setSearchText = useCallback(
    (text: string) => screen.setSearchText(frameId, text),
    [screen, frameId],
  );
  const [children, setChildren] = useState<Entry[]>([]);
  const [found, setFound] = useState<Entry[]>([]);
  const [visitLog, setVisitLog] = useState<VisitLog>({ tick: 0, items: {} });
  const visits = visitLog.items;
  const tick = visitLog.tick;
  const [pins, setPins] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [backgroundPending, setBackgroundPending] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string>();
  const [searchPartial, setSearchPartial] = useState<string>();
  const [searchActive, setSearchActive] = useState(true);
  const [sortMode, setSortMode] = useCachedState<SortMode>(
    "sort-mode",
    "usage",
  );
  const [typeFilter, setTypeFilter] = useCachedState<TypeFilter>(
    "type-filter",
    "all",
  );
  const [showingDetail, setShowingDetail] = useState(false);
  /** True until scoped entries receive cached or fresh usage metadata. */
  const [childrenUsagePending, setChildrenUsagePending] = useState(false);
  const [folderError, setFolderError] = useState<string>();
  const [folderMetaError, setFolderMetaError] = useState<string>();
  const [folderMetaPartial, setFolderMetaPartial] = useState<string>();

  const query = searchText.trim();
  /** A leading / or ~/ activates the path bar in global mode. */
  const pathQuery = useMemo(
    () => (dir ? undefined : splitPathQuery(searchText)),
    [dir, searchText],
  );
  /** Name fragment used by path-bar results. */
  const effectiveQuery = pathQuery ? pathQuery.prefix : query;
  const parsed = useMemo(
    () => parseQuery(searchText, typeFilter),
    [searchText, typeFilter],
  );
  // Dot-prefixed queries temporarily include hidden entries.
  const showHidden = includeHidden || parsed.hidden;
  const scopeController = useMemo(
    () => new AbortController(),
    [dir, showHidden, reloadKey, searchActive],
  );
  const [queryRevision, setQueryRevision] = useState(0);
  const queryController = useMemo(
    () => new AbortController(),
    [scopeController, query, parsed.type, queryRevision],
  );
  // These signals cancel user-obsoleted work; each effect cleans up its own work.
  useEffect(() => {
    const stop = () => queryController.abort();
    if (!searchActive || scopeController.signal.aborted) stop();
    scopeController.signal.addEventListener("abort", stop, { once: true });
    return () => {
      scopeController.signal.removeEventListener("abort", stop);
    };
  }, [scopeController, queryController, searchActive]);
  const navigate = useCallback(
    (target: string, initialSelectionPath?: string) => {
      if (!navigation.canNavigate(frameId, target)) return;
      scopeController.abort();
      setSearchActive(false);
      onNavigate(frameId, target, initialSelectionPath);
    },
    [scopeController, navigation, frameId, onNavigate],
  );
  const returnToStart = useCallback(() => {
    if (
      !navigation.isCurrent(frameId) ||
      (dir === undefined && searchText === "")
    )
      return;
    scopeController.abort();
    setSearchActive(false);
    onReturnToStart(frameId);
  }, [navigation, frameId, dir, searchText, scopeController, onReturnToStart]);
  const scopeCandidates = useMemo(() => (dir ? [{ path: dir }] : []), [dir]);
  const scopeCache = useCachedEntries(
    scopeCandidates,
    "-d",
    reloadKey,
    Infinity,
    queryController.signal,
  );
  const canonicalDir = scopeCache.entries[0]?.storagePath ?? dir;
  const recentFiles = useRecentFiles(
    setup,
    query,
    dir,
    showHidden,
    reloadKey,
    canonicalDir,
    queryController.signal,
    parsed.type,
  );
  const directoryListing = useDirectoryListing(
    dir,
    showHidden,
    reloadKey,
    scopeController.signal,
    searchActive,
  );
  const minQuery = dir ? MIN_QUERY_SCOPED : MIN_QUERY_GLOBAL;
  const standardCache = useStandardPlaces(!dir && searchActive, reloadKey);
  const places = standardCache.entries;
  const [sharedFolders, setSharedFolders] = useState<Entry[]>([]);
  const [shortcutIndex, setShortcuts] = useState<Shortcut[]>([]);
  const [shortcutsScannedAt, setShortcutsScannedAt] = useState(0);
  const [driveIndexMessage, setDriveIndexMessage] = useState<string>();
  /** Paths in Google Drive shared folders that Spotlight cannot index. */
  const [sharedIndex, setSharedIndex] = useState<string[]>([]);
  /** Paths earlier Spotlight passes surfaced. See lib/discovered.ts. */
  const [discovered, setDiscovered] = useState<string[]>([]);

  /** Changes when the result set changes; paths keep IDs stable while reranking. */
  const [generation, setGeneration] = useState(0);

  /** True while the usage metadata for the Spotlight results is still coming. */
  const [foundUsagePending, setFoundUsagePending] = useState(false);
  const [foundUsageError, setFoundUsageError] = useState<string>();
  const [foundUsagePartial, setFoundUsagePartial] = useState<string>();

  /** Learned query-to-path associations. */
  const [abbreviations, setAbbreviations] = useState<
    Record<string, Record<string, number>>
  >({});
  const [resultsTruncated, setResultsTruncated] = useState(false);
  const [folderEntriesOmitted, setFolderEntriesOmitted] = useState(0);

  // Load unindexed Drive roots outside the initial render.
  useEffect(() => {
    if (dir) return; // only the whole-disk search needs to compensate for this
    const timer = setTimeout(() => {
      const found = sharedCloudFolders()
        .map((place) => statEntry(place.path))
        .filter((e): e is Entry => e !== undefined);
      setSharedFolders(found);
    }, 0);
    return () => clearTimeout(timer);
  }, [dir, reloadKey]);

  // Load only visits and pins before the first useful frame.
  useEffect(() => {
    let cancelled = false;
    const generation = dataGeneration();
    void (async () => {
      try {
        const [v, p] = await Promise.all([loadVisitLog(), loadPins()]);
        if (cancelled || generation !== dataGeneration()) return;
        setVisitLog(v);
        setPins(p);
      } finally {
        if (!cancelled && generation === dataGeneration()) setIsLoading(false);
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    const generation = dataGeneration();
    const current = () => !cancelled && generation === dataGeneration();
    setBackgroundPending(true);
    void (async () => {
      try {
        const history = await loadSearches();
        if (!current()) return;
        setHistory(history);

        const index = await loadShortcutIndex();
        if (!current()) return;
        setShortcuts(index.shortcuts);
        setShortcutsScannedAt(index.scannedAt);
        const shared = loadSharedIndex();
        setDriveIndexMessage(driveIndexCaveat(index, shared));
        const abbreviations = await loadAbbreviations();
        if (!current()) return;
        setAbbreviations(abbreviations);
        setDiscovered(loadDiscovered());
        setSharedIndex(shared.paths);
      } finally {
        if (current()) setBackgroundPending(false);
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Show directory entries before loading usage metadata.
  useEffect(() => {
    if (!dir) {
      setChildren([]);
      setChildrenUsagePending(false);
      setFolderEntriesOmitted(0);
      setFolderError(undefined);
      setFolderMetaError(undefined);
      setFolderMetaPartial(undefined);
      return;
    }
    if (!searchActive || scopeController.signal.aborted) return;
    let cancelled = false;
    const controller = new AbortController();
    const stop = () => {
      cancelled = true;
      controller.abort();
    };
    scopeController.signal.addEventListener("abort", stop, { once: true });
    const read = directoryListing;
    const storageGeneration = dataGeneration();
    setFolderEntriesOmitted(read.truncated);
    setFolderError(read.error);
    setFolderMetaError(undefined);
    setFolderMetaPartial(undefined);

    // Seed the first frame with cached usage metadata.
    const cached = readCachedUsage(dir);
    const missing = missingUsagePaths(
      read.entries.map((entry) => entry.path),
      cached,
    );
    setChildrenUsagePending(missing.length > 0);
    setChildren(
      cached.size === 0
        ? read.entries
        : read.entries.map((e) => {
            const m = cached.get(e.path);
            return m ? { ...e, ...m } : e;
          }),
    );

    void (async () => {
      if (read.entries.length === 0) {
        setChildrenUsagePending(false);
        return;
      }
      // Fetch only uncached metadata so timed-out folders fill incrementally.
      if (missing.length === 0) {
        setChildrenUsagePending(false);
        return;
      }
      const result = await readUsageMetaResult(missing, {
        signal: controller.signal,
        continuous: true,
        onProgress: (meta) => {
          if (cancelled || storageGeneration !== dataGeneration()) return;
          setChildren((previous) =>
            previous.map((entry) => {
              const usage = meta.get(entry.path);
              return usage ? { ...entry, ...usage } : entry;
            }),
          );
        },
      });
      if (cancelled) return;
      setChildrenUsagePending(false);
      setFolderMetaError(result.error);
      setFolderMetaPartial(result.partial);
      const meta = result.meta;
      if (meta.size === 0) return;
      void writeCachedUsage(
        dir,
        new Map([...cached, ...meta]),
        storageGeneration,
      );
      if (cancelled || storageGeneration !== dataGeneration()) return;
      setChildren((prev) =>
        prev.map((e) => {
          const m = meta.get(e.path);
          return m ? { ...e, ...m } : e;
        }),
      );
    })();

    return () => {
      scopeController.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [
    dir,
    showHidden,
    reloadKey,
    directoryListing.entries,
    directoryListing.error,
    directoryListing.truncated,
    scopeController,
    searchActive,
  ]);

  // Rank paths first within each arriving batch, then validate without a shortlist cutoff.
  useEffect(() => {
    setFound([]);
    setFoundUsagePending(false);
    setFoundUsageError(undefined);
    setFoundUsagePartial(undefined);
    setSearchError(undefined);
    setSearchPartial(undefined);
    if (
      !searchActive ||
      queryController.signal.aborted ||
      dir !== undefined ||
      pathQuery ||
      parsed.longest.length < minQuery
    ) {
      setSearching(false);
      setResultsTruncated(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const storageGeneration = dataGeneration();
    // Eight validators, two processes, and the queues share this cancellation signal.
    setMaxListeners(32, controller.signal);
    const current = () =>
      !cancelled &&
      !controller.signal.aborted &&
      storageGeneration === dataGeneration();
    const matches = new Map<string, Entry>();
    const expanded = new Set<string>();
    const walkedDirectories = new Set<string>();
    let publishTimer: ReturnType<typeof setTimeout> | undefined;
    let lastPublished = 0;
    let usageSucceeded = false;
    let usageIncomplete = false;
    let usageFailed = false;
    let discoveryFailure: string | undefined;
    const publish = (flush = false) => {
      if (!current()) return;
      if (flush || Date.now() - lastPublished >= 100) {
        clearTimeout(publishTimer);
        publishTimer = undefined;
        lastPublished = Date.now();
        setFound([...matches.values()]);
      } else if (!publishTimer) {
        publishTimer = setTimeout(() => publish(true), 100);
      }
    };
    const add = (entries: Entry[]) => {
      if (!current()) return;
      for (const entry of entries)
        if (matches.has(entry.path) || matches.size < LIVE_RESULTS)
          matches.set(entry.path, { ...matches.get(entry.path), ...entry });
      publish();
    };
    const usage = createWorkQueue<string>(
      async (paths) => {
        if (!current()) return;
        setFoundUsagePending(true);
        const result = await readUsageMetaResult(paths, {
          timeoutMs: 5000,
          signal: controller.signal,
        });
        if (!current()) return;
        usageSucceeded ||= result.complete || result.meta.size > 0;
        usageIncomplete ||= !result.complete;
        usageFailed ||= !!result.error;
        for (const [full, meta] of result.meta) {
          const entry = matches.get(full);
          if (entry) matches.set(full, { ...entry, ...meta });
        }
        publish();
      },
      controller.signal,
      { batchSize: 25 },
    );
    const validation = createWorkQueue<{ path: string; expand: boolean }>(
      async ([candidate]) => {
        if (!current()) return;
        const checked = await validateRecentEntries([candidate], {
          continuous: true,
          query: "",
          signal: controller.signal,
        });
        if (!current()) return;
        if (checked.partial)
          setSearchPartial("Some matching files could not be checked");
        const entry = checked.entries[0];
        if (!entry) return;
        if (
          candidate.expand &&
          entry.isDirectory &&
          !expanded.has(entry.path)
        ) {
          if (expanded.size < LIVE_DIRECTORIES) {
            expanded.add(entry.path);
            await expansion.push([entry.path]);
          } else setResultsTruncated(true);
        }
        if (
          matchPath(parsed, entry.path, entry.isDirectory) === undefined ||
          !matchesStats(parsed, entry)
        )
          return;
        if (!matches.has(entry.path) && matches.size >= LIVE_RESULTS) {
          setResultsTruncated(true);
          return;
        }
        add([entry]);
        await usage.push([entry.path]);
      },
      controller.signal,
      { concurrency: 8 },
    );
    const scheduled = new Set<string>();
    const consume = async (paths: string[], expand = false) => {
      if (!current()) return;
      const expanding = expand && excludesDirectories(parsed);
      const ranked = paths
        .flatMap((full) => {
          if (scheduled.has(full)) return [];
          const tier = matchPath(parsed, full);
          // A matching folder can contain qualifying files even when it fails the file filters.
          if (tier === undefined && !expanding) return [];
          if (scheduled.size >= LIVE_CANDIDATES) {
            setResultsTruncated(true);
            return [];
          }
          scheduled.add(full);
          return [
            {
              path: full,
              expand: expanding,
              tier: tier ?? Infinity,
              coarse: coarseScore(
                visits[full],
                tick,
                dir ? relativeDepth(dir, full) : 0,
              ),
            },
          ];
        })
        .sort((a, b) => a.tier - b.tier || b.coarse - a.coarse);
      await validation.push(ranked);
    };
    const expansion = createWorkQueue<string>(
      async ([root]) => {
        const result = await listUnder([root], {
          showHidden,
          continuous: true,
          signal: controller.signal,
          visited: walkedDirectories,
          onBatch: consume,
        });
        if (current() && result.truncated) setResultsTruncated(true);
        if (current() && result.error) setSearchPartial(result.error);
      },
      controller.signal,
      { concurrency: 8, maxPending: Infinity },
    );
    setSearching(true);
    setResultsTruncated(false);
    const timer = setTimeout(() => {
      void (async () => {
        const result = await searchPathResult(parsed.longest, {
          fuzzy: true,
          showHidden,
          max: LIVE_CANDIDATES,
          signal: controller.signal,
          onBatch: (paths) => consume(paths, true),
        });
        if (!current()) return;
        const report = (result: { truncated: boolean; error?: string }) => {
          if (!current()) return;
          if (result.truncated) setResultsTruncated(true);
          if (result.error) {
            discoveryFailure ??= result.error;
            setSearchPartial(result.error);
          }
        };
        report(result);
        const dotted = dottedTerms(parsed);
        if (dotted.length > 0 && current()) {
          const listing = await readDirectoryAsync(
            dir ?? os.homedir(),
            true,
            controller.signal,
          );
          if (!current()) return;
          if (listing.truncated) setResultsTruncated(true);
          if (listing.error) setSearchPartial(listing.error);
          const roots = listing.entries
            .filter(
              (entry) =>
                entry.isDirectory &&
                entry.name.startsWith(".") &&
                dotted.some((term) =>
                  entry.name.toLowerCase().startsWith(term.toLowerCase()),
                ),
            )
            .map((entry) => entry.path);
          if (roots.length > 0) {
            await consume(roots);
            report(
              await listUnder(roots, {
                visited: walkedDirectories,
                showHidden: true,
                continuous: true,
                signal: controller.signal,
                onBatch: consume,
              }),
            );
          }
        }
        await validation.drain();
        await expansion.drain();
        await validation.drain();
        await usage.drain();
        if (!current()) return;
        const ranked = [...matches.keys()].map((path) => ({ path }));
        const shortlist = [...matches.values()];
        void rememberDiscovered(
          ranked.map((r) => r.path),
          storageGeneration,
        ).then((remembered) => {
          if (
            !cancelled &&
            storageGeneration === dataGeneration() &&
            remembered.length > 0
          )
            setDiscovered(remembered);
        });
        setFound(shortlist);
      })()
        .catch(() => {
          if (current()) {
            publish(true);
            setSearchError("Search could not finish");
            controller.abort();
          }
        })
        .finally(() => {
          validation.dispose();
          expansion.dispose();
          usage.dispose();
          if (cancelled || storageGeneration !== dataGeneration()) return;
          publish(true);
          clearTimeout(publishTimer);
          setSearching(false);
          setFoundUsagePending(false);
          if (discoveryFailure) {
            if (matches.size > 0) setSearchPartial(discoveryFailure);
            else {
              setSearchPartial(undefined);
              setSearchError(discoveryFailure);
            }
          }
          setFoundUsageError(
            usageFailed && !usageSucceeded
              ? "Spotlight usage metadata unavailable"
              : undefined,
          );
          setFoundUsagePartial(
            usageIncomplete && (!usageFailed || usageSucceeded)
              ? "Usage metadata unavailable for some items"
              : undefined,
          );
        });
    }, DEBOUNCE_MS);
    const stop = () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
      clearTimeout(publishTimer);
    };
    queryController.signal.addEventListener("abort", stop, { once: true });
    return () => {
      queryController.signal.removeEventListener("abort", stop);
      stop();
    };
    // Visit changes affect local ranking and should not rerun Spotlight.
  }, [
    dir,
    query,
    minQuery,
    pathQuery !== undefined,
    showHidden,
    reloadKey,
    queryController,
    searchActive,
  ]);

  /** Pinned, frequently used, and standard locations. */
  const startingCandidates = useMemo(() => {
    if (dir) return [];
    const paths = new Set(pins);
    for (const [target] of Object.entries(visits)
      .map(([target, visit]) => [target, visitScore(visit, tick)] as const)
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40))
      paths.add(target);
    for (const place of places) paths.add(place.path);
    return [...paths].map((path) => ({ path }));
  }, [dir, pins, visits, places, tick]);
  const startingCache = useCachedEntries(
    startingCandidates,
    "",
    reloadKey,
    Infinity,
    queryController.signal,
    parsed.type,
  );
  const startingPoints = startingCache.entries;

  /** Previously-surfaced paths, matched in memory. See lib/discovered.ts. */
  const discoveredCandidates = useMemo(() => {
    if (query === "") return [];
    return discovered
      .flatMap((p) => {
        if (dir && path.dirname(p) !== dir && path.dirname(p) !== canonicalDir)
          return [];
        const tier = matchPath(parsed, p);
        return tier === undefined ? [] : [{ path: p, tier }];
      })
      .sort((a, b) => a.tier - b.tier);
  }, [dir, canonicalDir, query, parsed, discovered]);
  const discoveredCache = useCachedEntries(
    discoveredCandidates,
    query,
    reloadKey,
    Infinity,
    queryController.signal,
    parsed.type,
  );
  const discoveredMatches = discoveredCache.entries;

  /** Matches from the Google Drive shared-folder index. */
  const sharedCandidates = useMemo(() => {
    if (dir || query === "") return [];
    return sharedIndex
      .flatMap((p) => {
        const tier = matchPath(parsed, p);
        return tier === undefined ? [] : [{ path: p, tier }];
      })
      .sort((a, b) => a.tier - b.tier);
  }, [dir, query, parsed, sharedIndex]);
  const sharedCache = useCachedEntries(
    sharedCandidates,
    query,
    reloadKey,
    Infinity,
    queryController.signal,
    parsed.type,
  );
  const sharedMatches = sharedCache.entries;
  const shortcutCandidates = useMemo(() => {
    if (query === "") return [];
    return shortcutIndex
      .flatMap(({ path: full }) => {
        if (
          dir &&
          path.dirname(full) !== dir &&
          path.dirname(full) !== canonicalDir
        )
          return [];
        const tier = matchPath(parsed, full);
        return tier === undefined ? [] : [{ path: full, tier }];
      })
      .sort((a, b) => a.tier - b.tier);
  }, [shortcutIndex, query, parsed, dir, canonicalDir]);
  const shortcutCache = useCachedEntries(
    shortcutCandidates,
    query,
    reloadKey,
    Infinity,
    queryController.signal,
    parsed.type,
  );
  const shortcuts = shortcutCache.entries;

  /** Paths you have previously chosen after typing this exact query. */
  const learnedPaths = useMemo(
    () => Object.keys(abbreviations[parsed.normalized] ?? {}),
    [abbreviations, parsed.normalized],
  );
  const learnedSet = useMemo(() => new Set(learnedPaths), [learnedPaths]);
  const learnedCandidates = useMemo(
    () =>
      learnedPaths
        .filter(
          (full) =>
            !dir ||
            path.dirname(full) === dir ||
            path.dirname(full) === canonicalDir,
        )
        .map((path) => ({ path })),
    [learnedPaths, dir, canonicalDir],
  );
  const learnedCache = useCachedEntries(
    learnedCandidates,
    "",
    reloadKey,
    Infinity,
    queryController.signal,
    parsed.type,
  );
  const learnedMatches = learnedCache.entries;
  const cachedPending =
    shortcutCache.pending ||
    scopeCache.pending ||
    standardCache.pending ||
    startingCache.pending ||
    discoveredCache.pending ||
    sharedCache.pending ||
    learnedCache.pending;
  const cachedPartial =
    shortcutCache.partial ||
    scopeCache.partial ||
    standardCache.partial ||
    startingCache.partial ||
    discoveredCache.partial ||
    sharedCache.partial ||
    learnedCache.partial;

  /** Hidden Home entries shown for a bare dot in global mode. */
  const hiddenListing = useDirectoryListing(
    !dir && !pathQuery && hiddenOnly(parsed) ? os.homedir() : undefined,
    true,
    reloadKey,
    scopeController.signal,
    searchActive,
  );
  const hiddenHome = hiddenListing.entries;

  /** Children of the typed directory, plus the directory itself if it exists. */
  const typedDirectory = useDirectoryListing(
    pathQuery?.dir,
    showHidden,
    reloadKey,
    queryController.signal,
    searchActive,
  );
  const exactPath = pathQuery
    ? pathQuery.prefix === ""
      ? pathQuery.dir
      : path.join(pathQuery.dir, pathQuery.prefix)
    : undefined;
  const [exactEntry, setExactEntry] = useState<{
    path: string;
    listing: DirectorySnapshot;
    entry?: Entry;
    reloadKey: number;
  }>();
  useEffect(() => {
    if (exactPath === undefined) return;
    const controller = new AbortController();
    const stop = () => controller.abort();
    queryController.signal.addEventListener("abort", stop, { once: true });
    if (queryController.signal.aborted) stop();
    const listed = typedDirectory.entries.find(
      (entry) => entry.path === exactPath,
    );
    const read = listed
      ? Promise.resolve(listed)
      : validateRecentEntries([{ path: exactPath }], {
          continuous: true,
          signal: controller.signal,
        }).then((result) => result.entries[0]);
    void read.then((entry) => {
      if (!controller.signal.aborted)
        setExactEntry({
          path: exactPath,
          listing: typedDirectory,
          entry,
          reloadKey,
        });
    });
    return () => {
      queryController.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [exactPath, typedDirectory, reloadKey, queryController]);
  const exactReady =
    exactPath === undefined ||
    (exactEntry?.path === exactPath &&
      exactEntry.listing === typedDirectory &&
      exactEntry.reloadKey === reloadKey);
  const pathListing = useMemo(
    () => ({
      rows: pathQuery
        ? [
            ...(exactReady && exactEntry?.entry ? [exactEntry.entry] : []),
            ...typedDirectory.entries,
          ]
        : [],
      omitted: typedDirectory.truncated,
      error: typedDirectory.error,
      pending: typedDirectory.pending || !exactReady,
    }),
    [pathQuery, exactReady, exactEntry, typedDirectory],
  );
  const pathRows = pathListing.rows;

  const compare = useMemo(() => compareRankedEntries(sortMode), [sortMode]);

  /** Ranks and deduplicates candidates; exclude removes rows already shown. */
  const rankSources = useCallback(
    (sources: Entry[], exclude?: Set<string>) => {
      const now = Date.now();
      const byPath = new Map<string, Entry>();
      for (const entry of sources) {
        if (exclude?.has(entry.path)) continue;
        // Path-bar listings filter separately and allow explicitly typed paths.
        if (!showHidden && !pathQuery && entry.name.startsWith(".")) continue;
        if (dir) {
          // Every source must respect the folder boundary, including late results.
          if (
            path.dirname(entry.path) !== dir &&
            path.dirname(entryStoragePath(entry)) !== (canonicalDir ?? dir)
          )
            continue;
        }
        const prev = byPath.get(entry.path);
        // Prefer the copy that carries Spotlight usage metadata.
        byPath.set(
          entry.path,
          prev
            ? {
                ...prev,
                useCount: prev.useCount ?? entry.useCount,
                lastUsedMs: prev.lastUsedMs ?? entry.lastUsedMs,
              }
            : entry,
        );
      }

      const out: Ranked[] = [];
      for (const entry of byPath.values()) {
        if (entry.path === dir) continue;
        // Learned associations outrank textual matches.
        const storagePath = entryStoragePath(entry);
        const learned = learnedSet.has(storagePath);
        // Normal search may match path components; path-bar search matches names.
        if (hiddenOnly(parsed) && !entry.name.startsWith(".")) continue;
        const textual = pathQuery
          ? matchTier(effectiveQuery, entry.name)
          : matchPath(parsed, entry.path, entry.isDirectory);
        const tier = learned ? MATCH.LEARNED : textual;
        if (tier === undefined) continue;
        if (!matchesStats(parsed, entry)) continue;
        const below = dir ? relativeDepth(dir, entry.path) : 0;
        out.push({
          entry,
          tier,
          score: scoreEntry(entry, {
            visit: visits[storagePath],
            now,
            tick,
            depthBelow: below,
            quality: matchQuality(parsed.longest, entry.name),
          }),
        });
      }

      // Deduplicate aliases by identity while preserving differently named shortcuts.
      const byIdentity = new Map<string, Ranked>();
      const deduped: Ranked[] = [];
      for (const row of out) {
        const { dev, ino } = row.entry;
        if (dev === undefined || ino === undefined) {
          deduped.push(row);
          continue;
        }
        const key = `${dev}:${ino}:${row.entry.name.toLowerCase()}`;
        const seen = byIdentity.get(key);
        if (seen === undefined) {
          byIdentity.set(key, row);
          deduped.push(row);
        } else if (row.score.total > seen.score.total) {
          // Keep the higher-scoring route in place.
          deduped[deduped.indexOf(seen)] = row;
          byIdentity.set(key, row);
        }
      }

      return deduped.sort(compare);
    },
    [
      learnedSet,
      pathQuery,
      visits,
      tick,
      effectiveQuery,
      parsed,
      dir,
      canonicalDir,
      compare,
      showHidden,
    ],
  );

  /** Results available without a new Spotlight query. */
  const instantRows = useMemo(() => {
    if (pathQuery) return rankSources(pathRows);
    return rankSources([
      ...children,
      ...startingPoints,
      ...recentFiles.entries,
      // Shared Drive roots are useful only when there is a query.
      ...(query === "" ? [] : sharedFolders),
      ...(query === "" ? [] : shortcuts),
      ...sharedMatches,
      ...discoveredMatches,
      ...learnedMatches,
      ...hiddenHome,
    ]);
  }, [
    rankSources,
    pathQuery,
    pathRows,
    children,
    startingPoints,
    recentFiles.entries,
    query,
    sharedFolders,
    shortcuts,
    sharedMatches,
    discoveredMatches,
    learnedMatches,
    hiddenHome,
  ]);

  /** Delayed search results and cached rows share metadata before ranking. */
  const collectedRows = useMemo(
    () =>
      pathQuery
        ? instantRows
        : rankSources([...found, ...instantRows.map(({ entry }) => entry)]),
    [pathQuery, found, instantRows, rankSources],
  );
  const rowLimitReached = collectedRows.length > LIVE_RESULTS;
  const rows = collectedRows.slice(0, LIVE_RESULTS);

  const markVisited = useCallback(
    async (target: string, generation = dataGeneration()) => {
      const visits = await recordVisit(target, generation);
      if (generation === dataGeneration()) setVisitLog(visits);
    },
    [],
  );

  /** Records a query and optionally learns its selected target. */
  const commitSearch = useCallback(
    async (target?: string, storageGeneration = dataGeneration()) => {
      if (query === "") return;
      const history = await recordSearch(query, storageGeneration);
      if (storageGeneration !== dataGeneration()) return;
      setHistory(history);
      if (target !== undefined) {
        setAbbreviations(
          await recordAbbreviation(
            parsed.normalized,
            target,
            storageGeneration,
          ),
        );
      }
    },
    [query, parsed.normalized],
  );

  // Record settled queries without storing every typed prefix.
  useEffect(() => {
    if (query.length < minQuery || pathQuery) return;
    const storageGeneration = dataGeneration();
    let cancelled = false;
    const timer = setTimeout(() => {
      void recordSearch(query, storageGeneration)
        .then((history) => {
          if (!cancelled && storageGeneration === dataGeneration())
            setHistory(history);
        })
        .catch(() => {
          /* Background history is best-effort, including during deletion. */
        });
    }, HISTORY_SETTLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, minQuery, pathQuery]);

  // SearchScreen updates text directly; only native input resets the history cursor.
  const setQueryProgrammatically = useCallback(
    (next: string) => {
      if (next.trim() !== query || queryController.signal.aborted) {
        queryController.abort();
        setQueryRevision((revision) => revision + 1);
      }
      setSearchText(next);
    },
    [query, queryController, setSearchText],
  );

  const parent = dir ? path.dirname(dir) : undefined;

  const handlers: RowHandlers = useMemo(
    () => ({
      onToggleHidden,
      onReturnToStart:
        dir !== undefined || searchText !== "" ? returnToStart : undefined,
      onOpen: async (entry) => {
        // Persist ranking signals before the command closes.
        const generation = dataGeneration();
        await markVisited(entry.path, generation);
        await commitSearch(entry.path, generation);
        await closeMainWindow();
        await open(entry.path);
      },
      onDescend: (entry) => {
        void markVisited(entry.path).catch(() => {});
        void commitSearch(entry.path).catch(() => {});
        navigate(entry.path);
      },
      onUp:
        dir && parent && parent !== dir
          ? () => navigate(parent, dir)
          : undefined,
      onHistoryBack: () => {
        if (history.length === 0) {
          void showToast({
            style: Toast.Style.Failure,
            title: "No earlier searches yet",
            message:
              "Searches are remembered once you open or enter something.",
          });
          return;
        }
        if (historyIndex >= history.length - 1) {
          void showToast({
            style: Toast.Style.Failure,
            title: "That is the oldest search",
          });
          return;
        }
        const next = historyIndex + 1;
        setHistoryIndex(next);
        setQueryProgrammatically(history[next]);
      },
      onHistoryForward: () => {
        if (history.length === 0) {
          void showToast({
            style: Toast.Style.Failure,
            title: "No earlier searches yet",
          });
          return;
        }
        if (historyIndex <= 0) {
          setHistoryIndex(-1);
          setQueryProgrammatically("");
          return;
        }
        const next = historyIndex - 1;
        setHistoryIndex(next);
        setQueryProgrammatically(history[next]);
      },
      onTogglePin: async (entry) => setPins(await togglePin(entry.path)),
      onLearn:
        query === ""
          ? undefined
          : async (entry) => {
              setAbbreviations(
                await recordAbbreviation(parsed.normalized, entry.path),
              );
              await showToast({
                style: Toast.Style.Success,
                title: `"${query}" will now find ${entry.name}`,
              });
            },
      onReindexShortcuts: async () => {
        await withIndexingLock(async (assertOwned) => {
          const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Indexing Google Drive…",
          });
          // Bound interactive indexing so a cold mount cannot block indefinitely.
          const previousShortcuts = await loadShortcutIndex();
          const index = await scanShortcuts({ maxDepth: 6, budgetMs: 20_000 });
          const replaceShortcuts = shouldReplaceIndex(
            previousShortcuts.shortcuts.length,
            index.shortcuts.length,
            index.available,
            index.partial,
            previousShortcuts.partial,
          );
          if (replaceShortcuts) {
            assertOwned();
            await saveShortcutIndex(index);
          }
          if (!index.available) {
            toast.style = Toast.Style.Failure;
            toast.title = "Google Drive is unavailable";
            toast.message = "The previous index was kept.";
            return;
          }
          const activeShortcuts = replaceShortcuts ? index : previousShortcuts;
          setShortcuts(activeShortcuts.shortcuts);
          setShortcutsScannedAt(activeShortcuts.scannedAt);

          const previousShared = loadSharedIndex();
          const shared = await scanSharedFolders({ budgetMs: 20_000 });
          const replaceShared = shouldReplaceIndex(
            previousShared.paths.length,
            shared.paths.length,
            shared.available,
            shared.partial,
            previousShared.partial,
          );
          if (replaceShared) {
            assertOwned();
            if (!saveSharedIndex(shared)) {
              toast.style = Toast.Style.Failure;
              toast.title = "Google Drive index could not be saved";
              toast.message =
                "The shared-folder cache could not be updated. Try indexing again.";
              return;
            }
          }
          if (!shared.available) {
            toast.style = Toast.Style.Failure;
            toast.title = "Google Drive shared folders are unavailable";
            toast.message = "The previous index was kept.";
            return;
          }
          const activeShared = replaceShared ? shared : previousShared;
          setSharedIndex(activeShared.paths);
          setDriveIndexMessage(driveIndexCaveat(activeShortcuts, activeShared));

          toast.style = Toast.Style.Success;
          const indexCaveat = driveIndexCaveat(index, shared);
          if (!replaceShortcuts || !replaceShared) {
            const kept = [
              !replaceShortcuts && "shortcut",
              !replaceShared && "shared-folder",
            ]
              .filter(Boolean)
              .join(" and ");
            toast.title = "Google Drive refresh incomplete";
            toast.message = `Previous ${kept} index kept. ${indexCaveat}.`;
          } else {
            toast.title = `${shared.paths.length} items in shared folders`;
            toast.message = indexCaveat
              ? `${index.shortcuts.length} shortcuts. ${indexCaveat}.`
              : `${index.shortcuts.length} shortcuts indexed.`;
          }
        });
      },
      onToggleDetail: () => setShowingDetail((v) => !v),
      onRefresh: () => setReloadKey((k) => k + 1),
      onResetRanking: async (entry) =>
        setVisitLog(await resetVisit(entry.path)),
      onClearAllRankings: async () => {
        const confirmed = await confirmAlert({
          title: "Clear all usage history?",
          message:
            "Every file and folder goes back to being ranked by date until you use them again.",
          primaryAction: {
            title: "Clear History",
            style: Alert.ActionStyle.Destructive,
          },
        });
        if (confirmed) setVisitLog(await clearVisits());
      },
      onEraseEverything: async () => {
        const confirmed = await confirmAlert({
          title: "Delete all data and cache?",
          message:
            "Usage history, pins, search history, learned shortcuts and the Google Drive index. " +
            "Your files are not touched. This cannot be undone.",
          primaryAction: {
            title: "Delete Everything",
            style: Alert.ActionStyle.Destructive,
          },
        });
        if (!confirmed) return;

        const erased = await eraseEverything();
        if (!erased) return;
        // Rebuild component state from the cleared stores.
        setDiscovered([]);
        setFound([]);
        setReloadKey((k) => k + 1);

        await showToast({
          style: Toast.Style.Success,
          title: "Deleted everything",
          message: describeErased(erased),
        });
      },
    }),
    [
      dir,
      parent,
      history,
      historyIndex,
      query,
      parsed.normalized,
      shortcuts,
      shortcutsScannedAt,
      markVisited,
      commitSearch,
      setQueryProgrammatically,
      navigate,
      onToggleHidden,
      returnToStart,
      searchText,
    ],
  );

  // Reset row IDs for a new query; cached paths remain searchable.
  useEffect(() => {
    setGeneration((g) => g + 1);
  }, [parsed.normalized, parsed.type, dir]);

  const onSearchTextChange = useCallback(
    (next: string) => {
      if (next.trim() !== query || queryController.signal.aborted) {
        queryController.abort();
        setQueryRevision((revision) => revision + 1);
      }
      setHistoryIndex(-1);
      setSearchText(next);
    },
    [query, queryController, setSearchText],
  );

  const rankingReady = !isLoading;
  const searchLimitReached =
    resultsTruncated ||
    rowLimitReached ||
    recentFiles.limited ||
    [
      scopeCache,
      startingCache,
      shortcutCache,
      discoveredCache,
      sharedCache,
      learnedCache,
    ].some((cache) => cache.limited);
  const directoryPending =
    directoryListing.pending || pathListing.pending || hiddenListing.pending;
  const visibleFolderError = folderError ?? hiddenListing.error;

  // All search-status indicators derive from this shared progress model.
  const progress = deriveProgress({
    rankingReady,
    backgroundPending:
      backgroundPending || recentFiles.pending || cachedPending,
    memoryPartial: recentFiles.partial || cachedPartial,
    scoped: dir !== undefined || hiddenOnly(parsed),
    directChildrenOnly: dir !== undefined,
    folderMetaPending: childrenUsagePending || directoryPending,
    folderFailed:
      visibleFolderError !== undefined ||
      folderMetaError !== undefined ||
      pathListing.error !== undefined,
    folderPartial:
      folderMetaPartial !== undefined ||
      directoryListing.truncated > 0 ||
      pathListing.omitted > 0 ||
      hiddenListing.truncated > 0,
    isPathQuery: pathQuery !== undefined,
    query,
    isHiddenOnly: hiddenOnly(parsed),
    searching,
    searchFailed: searchError !== undefined,
    searchPartial: searchPartial !== undefined || searchLimitReached,
    termLength: parsed.longest.length,
    minQuery,
    rankingPending: foundUsagePending,
    rankingFailed: foundUsageError !== undefined,
    rankingPartial: foundUsagePartial !== undefined,
  });
  const settling = !isSettled(progress);
  const light = statusLight(progress);

  // Report incomplete results separately from progress completion.
  const omittedEntries = pathQuery
    ? pathListing.omitted
    : hiddenOnly(parsed) && !dir
      ? hiddenListing.truncated
      : folderEntriesOmitted;
  const caveat = searchLimitReached
    ? "Search limit reached — narrow your query or search inside a folder"
    : visibleFolderError
      ? "this folder could not be read"
      : pathListing.error
        ? "this location could not be read"
        : searchError
          ? searchError
          : searchPartial
            ? searchPartial
            : folderMetaError
              ? folderMetaError
              : folderMetaPartial
                ? folderMetaPartial
                : foundUsageError
                  ? foundUsageError
                  : foundUsagePartial
                    ? foundUsagePartial
                    : omittedEntries > 0
                      ? "Folder listing capped — some children were not read"
                      : resultsTruncated
                        ? "search reached a time, depth, or result limit"
                        : !dir && query !== "" && driveIndexMessage
                          ? driveIndexMessage
                          : dir && isUnindexedScope(dir)
                            ? "read directly, not in Spotlight's index"
                            : undefined;
  const scopeLabel = dir ? displayPath(dir) : "Everywhere";
  const tooShort =
    !dir && !pathQuery && query !== "" && query.length < minQuery;

  // Section titles describe scope rather than result source.
  const sectionTitle = pathQuery
    ? displayPath(pathQuery.dir)
    : dir
      ? scopeLabel
      : query === ""
        ? "Pinned, recent, and places"
        : "Everywhere";

  // Show “complete” only after every applicable stage settles.
  const sectionStatus = [
    `${rows.length} ${rows.length === 1 ? "item" : "items"}${settling ? " so far" : ""}`,
    light === "🟢" ? "complete" : describeProgress(progress),
    rows.length > LIVE_RENDERED_RESULTS
      ? `Display limited to ${LIVE_RENDERED_RESULTS} items — narrow your query`
      : undefined,
    caveat,
    recentFiles.partial || cachedPartial
      ? "some cached files could not be checked"
      : undefined,
  ]
    .filter(Boolean)
    .join(" · ")
    .replace(/\s+/gu, " ");

  // Prefer the best fast result still admitted by the combined result cap.
  const admittedPaths = new Set(rows.map(({ entry }) => entry.path));
  const firstMemoryPath = instantRows.find(({ entry }) =>
    admittedPaths.has(entry.path),
  )?.entry.path;
  const { selectedId, retainedPath, getSelectedPath, onSelectionChange } =
    useFolderSelection(initialSelectionPath, rows, generation, query, 0, true, {
      source:
        !rankingReady || !searchActive
          ? "waiting"
          : firstMemoryPath
            ? "memory"
            : "spotlight",
      path: firstMemoryPath,
      memoryPending:
        backgroundPending ||
        cachedPending ||
        recentFiles.pending ||
        directoryPending,
    });
  const retainedSelectionPath = retainedPath ?? getSelectedPath();
  const renderedRows = useMemo(
    () => displayRows(rows, retainedSelectionPath),
    [rows, retainedSelectionPath],
  );
  const rowHandlers = Object.fromEntries(
    Object.entries(handlers).map(([name, callback]) => [
      name,
      event(name, callback),
    ]),
  ) as RowHandlers;
  useEffect(() => {
    if (!environment.isDevelopment) return;
    traceNavigation("selection-request", {
      frameId,
      generation,
      rows: rows.length,
      requestedIndex: rows.findIndex(
        ({ entry }) => rowIdForEntry(generation, entry) === selectedId,
      ),
      restoring: initialSelectionPath !== undefined,
    });
  }, [frameId, generation, rows, selectedId]);
  const setupActions = {
    setup: recentFiles.setup,
    importing: recentFiles.importing,
    start: event("setupStart", recentFiles.start),
    cancel: event("setupCancel", recentFiles.cancel),
    skip: event("setupSkip", recentFiles.skip),
  };
  const payloadRef = useRef({
    children: 0,
    found: 0,
    recent: 0,
    cached: 0,
    rendered: 0,
  });
  payloadRef.current = {
    children: children.length,
    found: found.length,
    recent: recentFiles.entries.length,
    cached:
      scopeCache.entries.length +
      startingCache.entries.length +
      discoveredMatches.length +
      sharedMatches.length +
      shortcuts.length +
      learnedCache.entries.length,
    rendered: renderedRows.length,
  };
  useEffect(() => {
    traceNavigation("result-view-mounted", {
      frameId,
      scope: dir === undefined ? "global" : "folder",
    });
    return () => {
      const payload = payloadRef.current;
      traceNavigation("result-view-unmounted", {
        frameId,
        scope: dir === undefined ? "global" : "folder",
        ...payload,
      });
      traceNavigationAfterRelease("result-view-released", {
        frameId,
        ...payload,
      });
    };
  }, [frameId]);

  return (
    <SearchScreenContent
      screen={screen}
      frameId={frameId}
      actions={
        <ActionPanel>
          <NavigationActions
            onUp={rowHandlers.onUp}
            onReturnToStart={rowHandlers.onReturnToStart}
          />
          <HiddenFilesAction onToggle={rowHandlers.onToggleHidden} />
          <SetupActions {...setupActions} />
        </ActionPanel>
      }
      // Keep the progress bar active while any stage can reorder results.
      isLoading={!rankingReady || settling}
      // Raycast's own filter would re-rank by match score and wipe out the
      // usage ranking, so we filter and sort ourselves.
      filtering={false}
      selectedItemId={selectedId ?? undefined}
      onSelectionChange={event("selection", (id: string | null) => {
        if (!navigation.isCurrent(frameId)) return;
        if (environment.isDevelopment)
          traceNavigation("selection-received", {
            frameId,
            generation,
            rows: rows.length,
            selectedIndex: rows.findIndex(
              ({ entry }) => rowIdForEntry(generation, entry) === id,
            ),
            requestedIndex: rows.findIndex(
              ({ entry }) => rowIdForEntry(generation, entry) === selectedId,
            ),
            empty: id === null,
          });
        onSelectionChange(id);
      })}
      onSearchTextChange={event("query", onSearchTextChange)}
      searchBarPlaceholder={
        dir
          ? `Search in ${path.basename(dir) || dir}…`
          : "Search files and folders everywhere…"
      }
      navigationTitle={dir ? path.basename(dir) || scopeLabel : undefined}
      isShowingDetail={showingDetail && rows.length > 0}
      searchBarAccessory={
        <SearchOptions
          typeFilter={typeFilter}
          effectiveType={parsed.type}
          sortMode={sortMode}
          onSortChange={event("sort", setSortMode)}
          onTypeChange={event("type", (next: TypeFilter) => {
            if (parseQuery(searchText, next).type !== parsed.type)
              queryController.abort();
            setTypeFilter(next);
          })}
        />
      }
    >
      {rankingReady &&
        !dir &&
        query === "" &&
        (recentFiles.offered || recentFiles.importing) && (
          <List.Section title="Optional Setup">
            <List.Item
              id="search-setup"
              icon={Icon.Clock}
              title={
                recentFiles.importing
                  ? recentFiles.stage === "drive"
                    ? "Indexing Google Drive…"
                    : "Populating from Recent Files…"
                  : "Set Up Search"
              }
              subtitle={
                recentFiles.importing
                  ? recentFiles.progress
                  : (!recentFiles.setup.recents && !recentFiles.setup.drive
                      ? "Recent files · Google Drive indexing"
                      : [
                          recentFiles.setup.recents && "Recent files",
                          recentFiles.setup.drive && "Google Drive indexing",
                        ]
                          .filter(Boolean)
                          .join(" · ")) + " · optional, stored on this Mac"
              }
              actions={
                <ActionPanel>
                  <SetupActions {...setupActions} />
                  <NavigationActions
                    onUp={rowHandlers.onUp}
                    onReturnToStart={rowHandlers.onReturnToStart}
                  />
                  <HiddenFilesAction onToggle={rowHandlers.onToggleHidden} />
                </ActionPanel>
              }
            />
          </List.Section>
        )}
      {!rankingReady ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="Loading your usage history…"
          description="Nothing can be ranked until it is read."
        />
      ) : rows.length === 0 && (!searching || directoryPending) ? (
        <List.EmptyView
          icon={
            directoryPending
              ? Icon.Clock
              : tooShort
                ? Icon.Keyboard
                : Icon.MagnifyingGlass
          }
          title={
            directoryPending
              ? "Reading folder…"
              : visibleFolderError
                ? "Folder could not be read"
                : pathListing.error
                  ? "Location could not be read"
                  : searchError
                    ? "Search failed"
                    : searchLimitReached || omittedEntries > 0
                      ? "Search limit reached"
                      : tooShort
                        ? `Keep typing — ${minQuery} characters minimum`
                        : query === ""
                          ? "Nothing to show yet"
                          : `Nothing matching “${query}”`
          }
          description={
            directoryPending
              ? "You can keep typing while the folder loads."
              : visibleFolderError
                ? "Check that the folder still exists and that Raycast can access it."
                : pathListing.error
                  ? "Check that the location still exists and that Raycast can access it."
                  : searchError
                    ? "Check Spotlight and Raycast permissions, then try Refresh."
                    : searchLimitReached || omittedEntries > 0
                      ? "Only part of this location was checked. Use a more specific query or search inside a folder."
                      : tooShort
                        ? `The fast results are here already; a whole-disk search waits for ${minQuery} characters.`
                        : shortcutsScannedAt === 0
                          ? `Searched ${scopeLabel}. Google Drive is not indexed yet — run Index Google Drive from this panel.`
                          : `Searched ${scopeLabel}. Drive shortcuts last indexed ${relativeTime(shortcutsScannedAt)}.`
          }
          actions={
            <ActionPanel>
              <NavigationActions
                onUp={rowHandlers.onUp}
                onReturnToStart={rowHandlers.onReturnToStart}
              />
              <HiddenFilesAction onToggle={rowHandlers.onToggleHidden} />
              <SetupActions {...setupActions} />
              <SearchHistoryActions
                onHistoryBack={rowHandlers.onHistoryBack}
                onHistoryForward={rowHandlers.onHistoryForward}
              />
              <Action
                title="Index Google Drive"
                icon={Icon.HardDrive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                onAction={rowHandlers.onReindexShortcuts}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={rowHandlers.onRefresh}
              />
              {/* Keep cache recovery available when no rows are shown. */}
              <Action
                title="Delete All Data and Cache…"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={rowHandlers.onEraseEverything}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title={`${light}  ${compactScopeLabel(sectionTitle)} · ${sectionStatus}`}
        >
          {(searchActive ? renderedRows : []).map(({ entry, score }) => (
            <Row
              key={entry.path}
              id={rowIdForEntry(generation, entry)}
              entry={entry}
              visit={visits[entryStoragePath(entry)]}
              score={score}
              showScore={prefs.showScores}
              showingDetail={showingDetail}
              pinned={pins.includes(entryStoragePath(entry))}
              subtitle={
                dir && path.dirname(entry.path) === dir
                  ? undefined
                  : locationLabel(entry.path)
              }
              handlers={rowHandlers}
              setupActions={setupActions}
            />
          ))}
        </List.Section>
      )}
    </SearchScreenContent>
  );
}

/** A native route owns its input, result arrays and selection for one location. */
function BrowserFrame({
  frame,
  navigation,
  actions,
  ...session
}: {
  frame: SearchFrame;
  navigation: FolderNavigation;
  actions: FrameActions;
  includeHidden: boolean;
  onToggleHidden: () => void;
  setup: SearchSetup;
  reloadKey: number;
  setReloadKey: Dispatch<SetStateAction<number>>;
}) {
  const [screen] = useState(
    () => new SearchScreen(frame.id, frame.initialQuery),
  );
  return (
    <>
      <SearchScreenView screen={screen} />
      <BrowserView
        {...session}
        {...actions}
        screen={screen}
        navigation={navigation}
        frameId={frame.id}
        dir={frame.dir}
        initialSelectionPath={frame.selectedPath}
      />
    </>
  );
}

/** Only session settings and setup survive replacement of a native route. */
export function Browser(props: Props) {
  enableNavigationDiagnostics(environment.isDevelopment);
  const [includeHidden, setIncludeHidden] = useState(
    () => getPreferenceValues<Preferences>().showHidden,
  );
  const onToggleHidden = useCallback(
    () => setIncludeHidden((hidden) => !hidden),
    [],
  );
  const [navigation] = useState(
    () =>
      new FolderNavigation(
        props.dir === undefined ? undefined : normalizeDir(props.dir),
      ),
  );
  const [reloadKey, setReloadKey] = useState(0);
  const refreshAfterSetup = useCallback(
    () => setReloadKey((key) => key + 1),
    [],
  );
  const setup = useSearchSetup(reloadKey, refreshAfterSetup);
  const renderFrame = useCallback(
    (frame: SearchFrame, actions: FrameActions) => (
      <BrowserFrame
        frame={frame}
        navigation={navigation}
        actions={actions}
        includeHidden={includeHidden}
        onToggleHidden={onToggleHidden}
        setup={setup}
        reloadKey={reloadKey}
        setReloadKey={setReloadKey}
      />
    ),
    [navigation, includeHidden, onToggleHidden, setup, reloadKey],
  );
  return (
    <NativeSearchNavigation navigation={navigation} renderFrame={renderFrame} />
  );
}
