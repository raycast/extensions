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
import { Entry, SortMode, VisitLog } from "../lib/types";
import { describeErased, eraseEverything } from "../lib/erase";
import {
  deriveProgress,
  describeProgress,
  isSettled,
  missingUsagePaths,
  rowsCanChange,
  statusLight,
} from "../lib/progress";
import {
  displayPath,
  normalizeDir,
  locationLabel,
  splitPathQuery,
} from "../lib/read-dir";
import { readUsageMetaResult } from "../lib/spotlight";
import { dataGeneration } from "../lib/storage-lock";
import { readCachedUsage, writeCachedUsage } from "../lib/usage-cache";
import {
  clearVisits,
  loadPins,
  loadSearches,
  loadVisitLog,
  loadAbbreviations,
  recordAbbreviation,
  recordVisit,
  resetVisit,
  togglePin,
} from "../lib/store";
import { visitScore } from "../lib/score";
import { hiddenOnly, parseQuery, TypeFilter } from "../lib/query";
import { Row, RowHandlers } from "./row";
import { entryStoragePath, rowIdForEntry } from "../lib/entry-identity";
import { compactScopeLabel, relativeTime } from "../lib/format";
import { columnWidths } from "../lib/accessory-columns";
import { rankSources as rankCandidates } from "../lib/rank-sources";
import { displayRows } from "../lib/display-rows";
import { chooseListView, listIsLoading } from "../lib/list-view";
import { useDirectoryListing } from "./use-directory-listing";
import { useCachedEntries } from "./use-cached-entries";
import { useStandardPlaces } from "./use-standard-places";
import { usePathBarListing } from "./use-path-bar-listing";
import { useSearchHistoryRecording } from "./use-search-history-recording";
import { useSharedCloudFolders } from "./use-shared-cloud-folders";
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
import { enableNavigationDiagnostics } from "../lib/navigation-diagnostics";
import { useNavigationTracing } from "../lib/use-navigation-tracing";
import { LIVE_RESULTS, LIVE_RENDERED_RESULTS } from "../lib/search-limits";
import {
  IndexStatus,
  IndexCoverage,
  readIndexCoverage,
  searchIndex,
} from "../lib/index-reader";
import { describeCaveat } from "../lib/status-line";
import { stepSearchHistory } from "../lib/search-history";
import { rebuildWithFeedback, searchIndexPath } from "../lib/index-rebuild";

/** Minimum lengths for global discovery and scoped search history. */
const MIN_QUERY_GLOBAL = 3;
const MIN_QUERY_SCOPED = 2;
/**
 * Pause before querying the index.
 *
 * The query itself is a synchronous SQLite call measured at 1-2ms, so this
 * Short coalescing window; the remaining budget belongs to lookup and rendering.
 */
const INDEX_DEBOUNCE_MS = 20;
/**
 * How long the usage-metadata pass over a folder's children may take.
 * This optional cache warmup never delays or reranks the current query.
 */
const FOLDER_USAGE_BUDGET_MS = 3000;

function BrowserView({
  dir: rawDir,
  initialSelectionPath,
  screen,
  onNavigate,
  onReturnToStart,
  navigation,
  frameId,
  reloadKey,
  setReloadKey,
  includeHidden,
  onToggleHidden,
}: {
  /** Search scope; undefined searches all indexed locations. */
  dir?: string;
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
  /**
   * Everything about the query that changes what the index returns, as one
   * primitive. The search effect keys on this rather than on `parsed`: an
   * object identity in a dependency array re-runs the effect on every render
   * unless every caller memoises, and that failure mode is an unbounded
   * render loop rather than a visible bug.
   */
  const queryKey = useMemo(
    () =>
      JSON.stringify([
        parsed.tokens,
        parsed.type,
        parsed.extensions,
        parsed.after ?? null,
        parsed.before ?? null,
        parsed.minSize ?? null,
        parsed.maxSize ?? null,
        parsed.hidden,
      ]),
    [parsed],
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
  /**
   * A replaced query controller is aborted, not merely dropped.
   *
   * Changing hidden visibility rebuilds the scope controller and the query
   * controller in the same render, so the outgoing query controller never sees
   * an abort from its old scope. The cached-entry reads and the directory
   * listing hold that signal, and without this they would run to completion for
   * a query the user has already replaced.
   */
  useEffect(() => {
    // Strict Mode replays setup after cleanup with the same memoized controller.
    // Renew it only for a still-live scope; intentional navigation must stay cancelled.
    if (
      searchActive &&
      !scopeController.signal.aborted &&
      queryController.signal.aborted
    )
      setQueryRevision((revision) => revision + 1);
    return () => queryController.abort();
  }, [queryController, scopeController, searchActive]);
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
    queryController.signal,
  );
  const canonicalDir = scopeCache.entries[0]?.storagePath ?? dir;
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
  const sharedFolders = useSharedCloudFolders(dir, reloadKey);

  /** Changes when the result set changes; paths keep IDs stable while reranking. */
  const [generation, setGeneration] = useState(0);

  /** Where the index lives; stable for the life of the command. */
  const indexFile = useMemo(() => searchIndexPath(), []);
  const [indexStatus, setIndexStatus] = useState<IndexStatus>("missing");
  /** The index cannot answer anything, so rebuilding it is the useful action. */
  const noIndex = indexStatus === "missing" || indexStatus === "failed";
  /** True when the typed text is below the index minimum. */
  const [indexTooShort, setIndexTooShort] = useState(false);
  const [coverage, setCoverage] = useState<IndexCoverage>();
  const [rebuilding, setRebuilding] = useState(false);

  /** Learned query-to-path associations. */
  const [abbreviations, setAbbreviations] = useState<
    Record<string, Record<string, number>>
  >({});
  const [resultsTruncated, setResultsTruncated] = useState(false);

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

        const abbreviations = await loadAbbreviations();
        if (!current()) return;
        setAbbreviations(abbreviations);
        // Coverage drives the status line and the rebuild prompt.
        const indexCoverage = readIndexCoverage(indexFile);
        if (!current()) return;
        setCoverage(indexCoverage);
        setIndexStatus(indexCoverage.status);
      } finally {
        if (current()) setBackgroundPending(false);
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reloadKey, indexFile]);

  // Show directory entries before loading usage metadata.
  // Freeze optional usage for this query. A background cache write must not
  // rerank visible rows, even if a filesystem event refreshes their stats.
  const folderUsage = useMemo(
    () => (dir ? readCachedUsage(dir) : new Map()),
    [dir, showHidden, reloadKey, queryKey],
  );
  const children = useMemo(
    () =>
      folderUsage.size === 0
        ? directoryListing.entries
        : directoryListing.entries.map((entry) => {
            const meta = folderUsage.get(entry.path);
            return meta ? { ...entry, ...meta } : entry;
          }),
    [directoryListing.entries, folderUsage],
  );
  useEffect(() => {
    if (!dir) return;
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
    // Use the latest cache when choosing work; rendering uses its frozen copy.
    const cached = readCachedUsage(dir);
    const missing = missingUsagePaths(
      read.entries.map((entry) => entry.path),
      cached,
    ).slice(0, LIVE_RESULTS);

    void (async () => {
      // Fetch only uncached metadata so timed-out folders fill incrementally.
      if (missing.length === 0) return;
      /*
       * Warm only the cache. Applying late metadata to the current children
       * would move their ranking and selection after the list has appeared.
       * The next query, folder entry or explicit refresh uses the new values.
       */
      const result = await readUsageMetaResult(missing, {
        signal: controller.signal,
        timeoutMs: FOLDER_USAGE_BUDGET_MS,
      });
      if (cancelled || storageGeneration !== dataGeneration()) return;
      const meta = new Map(result.meta);
      // A successful read with no usage is still checked. Otherwise the same
      // unused files can consume the entire warmup budget on every query.
      if (result.complete)
        for (const full of missing) if (!meta.has(full)) meta.set(full, {});
      if (meta.size === 0) return;
      void writeCachedUsage(
        dir,
        new Map([...cached, ...meta]),
        storageGeneration,
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
    queryKey,
    directoryListing.entries,
    directoryListing.error,
    directoryListing.truncated,
    scopeController,
    searchActive,
  ]);

  /**
   * The indexed name search.
   *
   * One synchronous SQLite query produces one complete list, which is published
   * once. Nothing arrives later to reorder it, so there is no incremental
   * publication, no work queue and no window in which the selection can be
   * pulled out from under the user.
   *
   * A newer query cannot be overtaken by an older one by construction: the
   * query runs inside a debounce timer that a query change clears, and the call
   * is synchronous, so there is no await between deciding to publish and
   * publishing.
   */
  useEffect(() => {
    setFound([]);
    setSearchError(undefined);
    setIndexTooShort(false);
    if (
      !searchActive ||
      queryController.signal.aborted ||
      // A folder shows its direct children; it never queries the index.
      dir !== undefined ||
      pathQuery ||
      hiddenOnly(parsed) ||
      parsed.tokens.length === 0
    ) {
      setSearching(false);
      setResultsTruncated(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setResultsTruncated(false);
    const timer = setTimeout(() => {
      if (cancelled) return;
      const result = searchIndex(indexFile, parsed, {
        showHidden,
        limit: LIVE_RESULTS,
      });
      if (cancelled) return;
      setIndexStatus(result.status);
      setFound(result.entries);
      setResultsTruncated(result.truncated);
      setIndexTooShort(result.tooShort);
      setSearchError(
        result.status === "failed"
          ? "The search index could not be read"
          : undefined,
      );
      setSearching(false);
    }, INDEX_DEBOUNCE_MS);
    const stop = () => {
      cancelled = true;
      clearTimeout(timer);
    };
    queryController.signal.addEventListener("abort", stop, { once: true });
    return () => {
      queryController.signal.removeEventListener("abort", stop);
      stop();
    };
    // Visit changes affect local ranking only and must not rerun the query.
  }, [
    dir,
    queryKey,
    pathQuery !== undefined,
    showHidden,
    reloadKey,
    queryController,
    searchActive,
    indexFile,
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
    query,
    reloadKey,
    queryController.signal,
    parsed.type,
  );
  const startingPoints = startingCache.entries;

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
    queryController.signal,
    parsed.type,
  );
  const learnedMatches = learnedCache.entries;
  const cachedPending =
    scopeCache.pending ||
    standardCache.pending ||
    startingCache.pending ||
    learnedCache.pending;
  const cachedPartial =
    scopeCache.partial ||
    standardCache.partial ||
    startingCache.partial ||
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

  const pathListing = usePathBarListing(
    pathQuery,
    showHidden,
    reloadKey,
    queryController,
    searchActive,
  );
  const pathRows = pathListing.rows;

  const rankSources = useCallback(
    (sources: Entry[]) =>
      rankCandidates(sources, {
        now: Date.now(),
        tick,
        visits,
        learned: learnedSet,
        parsed,
        effectiveQuery,
        pathQuery: Boolean(pathQuery),
        dir,
        canonicalDir,
        showHidden,
        sortMode,
      }),
    [
      learnedSet,
      pathQuery,
      visits,
      tick,
      effectiveQuery,
      parsed,
      dir,
      canonicalDir,
      sortMode,
      showHidden,
    ],
  );

  /** Delayed search results and memory are ranked once, then retained within one row budget. */
  const selectionReader = useRef<
    | {
        query: string;
        queryKey: string;
        read: () => string | undefined;
      }
    | undefined
  >(undefined);
  // Read native selection before capping, including moves that did not render.
  // Only the current query may retain a row; new queries choose their own top.
  const preservedPath =
    selectionReader.current?.query === query &&
    selectionReader.current.queryKey === queryKey
      ? selectionReader.current.read()
      : query === ""
        ? initialSelectionPath
        : undefined;
  const { rows, rowLimitReached } = useMemo(() => {
    const collected = rankSources(
      pathQuery
        ? pathRows
        : [
            ...found,
            ...children,
            ...startingPoints,
            ...(query === "" ? [] : sharedFolders),
            ...learnedMatches,
            ...hiddenHome,
          ],
    );
    return {
      rows: displayRows(collected, preservedPath),
      rowLimitReached: collected.length > LIVE_RESULTS,
    };
  }, [
    rankSources,
    pathQuery,
    pathRows,
    children,
    startingPoints,
    query,
    sharedFolders,
    learnedMatches,
    hiddenHome,
    found,
    preservedPath,
  ]);

  const markVisited = useCallback(
    async (target: string, generation = dataGeneration()) => {
      const visits = await recordVisit(target, generation);
      if (generation === dataGeneration()) setVisitLog(visits);
    },
    [],
  );

  const commitSearch = useSearchHistoryRecording({
    query,
    minQuery,
    pathQuery,
    normalizedQuery: parsed.normalized,
    setHistory,
    setAbbreviations,
  });

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
        const step = stepSearchHistory(history, historyIndex, "back");
        if (step.kind === "refuse")
          void showToast({
            style: Toast.Style.Failure,
            title: step.title,
            ...(step.message === undefined ? {} : { message: step.message }),
          });
        else if (step.kind === "clear") {
          setHistoryIndex(-1);
          setQueryProgrammatically("");
        } else {
          setHistoryIndex(step.index);
          setQueryProgrammatically(step.query);
        }
      },
      onHistoryForward: () => {
        const step = stepSearchHistory(history, historyIndex, "forward");
        if (step.kind === "refuse")
          void showToast({
            style: Toast.Style.Failure,
            title: step.title,
            ...(step.message === undefined ? {} : { message: step.message }),
          });
        else if (step.kind === "clear") {
          setHistoryIndex(-1);
          setQueryProgrammatically("");
        } else {
          setHistoryIndex(step.index);
          setQueryProgrammatically(step.query);
        }
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
      onRebuildIndex: async () => {
        if (rebuilding) return;
        setRebuilding(true);
        try {
          await rebuildWithFeedback();
        } finally {
          setRebuilding(false);
          // Pick up the new coverage and drop the pre-rebuild snapshot.
          setReloadKey((k) => k + 1);
        }
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
      markVisited,
      commitSearch,
      setQueryProgrammatically,
      navigate,
      onToggleHidden,
      returnToStart,
      searchText,
      rebuilding,
      setReloadKey,
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
    [scopeCache, startingCache, learnedCache].some((cache) => cache.limited);
  const directoryPending =
    directoryListing.pending || pathListing.pending || hiddenListing.pending;
  const visibleFolderError = directoryListing.error ?? hiddenListing.error;

  // All search-status indicators derive from this shared progress model.
  const progress = deriveProgress({
    rankingReady,
    backgroundPending: backgroundPending || cachedPending,
    memoryPartial: cachedPartial,
    scoped: dir !== undefined || hiddenOnly(parsed),
    directChildrenOnly: dir !== undefined,
    folderMetaPending: directoryPending,
    folderFailed:
      visibleFolderError !== undefined || pathListing.error !== undefined,
    folderPartial:
      directoryListing.truncated > 0 ||
      pathListing.omitted > 0 ||
      hiddenListing.truncated > 0,
    isPathQuery: pathQuery !== undefined,
    query,
    isHiddenOnly: hiddenOnly(parsed),
    searching,
    searchFailed: searchError !== undefined,
    searchPartial: searchLimitReached,
    termLength: parsed.longest.length,
    minQuery,
    rankingPending: false,
  });
  const settling = !isSettled(progress);
  const light = statusLight(progress);

  // Report incomplete results separately from progress completion.
  const omittedEntries = pathQuery
    ? pathListing.omitted
    : hiddenOnly(parsed) && !dir
      ? hiddenListing.truncated
      : directoryListing.truncated;
  const caveat = describeCaveat({
    dir,
    pathQuery,
    indexStatus,
    indexTooShort,
    coverage,
    query,
    searchLimitReached,
    visibleFolderError,
    locationError: pathListing.error,
    searchError,
    omittedEntries,
    resultsTruncated,
  });
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
    cachedPartial ? "some cached files could not be checked" : undefined,
  ]
    .filter(Boolean)
    .join(" · ")
    .replace(/\s+/gu, " ");

  /**
   * Whether rows render, and equally whether a selection is requested.
   *
   * One predicate for both, because they are one decision. Splitting them is
   * what put the selection on the wrong row: rows rendered as soon as the
   * folder listing arrived, while the selection request was withheld until
   * every stage settled. In that window Raycast owns the selection, picks the
   * first row of an unranked list, and keeps that same item selected as usage
   * metadata re-ranks it downwards. Entering a folder for the first time
   * selected whichever file happened to be newest.
   *
   * Holding rows until nothing can reorder them is also what makes the
   * selection request right by construction rather than by timing: whoever
   * chooses the first row, us or Raycast, is choosing from the finished list.
   * Every stage is bounded, so the hold is too.
   */
  const listReady = searchActive && !rowsCanChange(progress);
  const { selectedId, retainedPath, getSelectedPath, onSelectionChange } =
    useFolderSelection({
      initialPath: initialSelectionPath,
      rows,
      generation,
      query,
      selectFirst: true,
      initialResult: {
        source: listReady ? "memory" : "waiting",
        memoryPending: false,
      },
    });
  selectionReader.current = {
    query,
    queryKey,
    read: () => retainedPath ?? getSelectedPath(),
  };
  const retainedSelectionPath = retainedPath ?? getSelectedPath();
  const renderedRows = useMemo(
    () => displayRows(rows, retainedSelectionPath),
    [rows, retainedSelectionPath],
  );
  /*
   * Exactly what will be rendered as rows.
   *
   * The branch below chooses on this rather than on `rows`, because a view
   * that holds rows does not necessarily render them. Deciding on `rows` left
   * a `List.Section` with no children: a blank screen with no message, and no
   * empty view to explain it.
   */
  const visibleRows = listReady ? renderedRows : [];
  const rowHandlers = Object.fromEntries(
    Object.entries(handlers).map(([name, callback]) => [
      name,
      event(name, callback),
    ]),
  ) as RowHandlers;
  const traceSelectionReceived = useNavigationTracing({
    isDevelopment: environment.isDevelopment,
    frameId,
    dir,
    generation,
    query,
    rows,
    selectedId,
    initialSelectionPath,
    listReady,
    queryController,
    screen,
    payload: {
      children: children.length,
      found: found.length,
      cached:
        scopeCache.entries.length +
        startingCache.entries.length +
        learnedCache.entries.length,
      rendered: renderedRows.length,
    },
  });

  /*
   * One set of column widths for the whole list, measured over the rows that
   * will render. Per-row widths would not be columns at all, and the rows are
   * published once, so these do not move while the list is on screen.
   */
  const columns = useMemo(
    () =>
      columnWidths(
        visibleRows.map(({ entry, score }) => ({
          visits: visits[entryStoragePath(entry)]?.count,
          score: prefs.showScores ? score.total : undefined,
          time: relativeTime(entry.mtimeMs),
        })),
      ),
    [visibleRows, visits, prefs.showScores],
  );

  /*
   * One decision, made in one place, for what the list shows. `rows` is not
   * the same question as `visibleRows`, and conflating them is what produced
   * a section with nothing in it.
   */
  const listView = chooseListView({
    rankingReady,
    visibleRows: visibleRows.length,
    leaving: !searchActive,
    computing: rowsCanChange(progress),
    directoryPending,
    tooShort,
    minQuery,
    query,
    folderError: visibleFolderError,
    locationError: pathListing.error,
    searchError,
    limitReached: searchLimitReached || omittedEntries > 0,
    noIndex,
  });
  const rebuildAction = (
    <Action
      title="Rebuild Search Index"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      onAction={rowHandlers.onRebuildIndex}
    />
  );
  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={rowHandlers.onRefresh}
    />
  );
  /**
   * The action panel both empty views share.
   *
   * Shared so Command-K is never a dead end. The usage history loads before
   * anything can be ranked, and during that moment the list is empty; without
   * this it had no actions of its own.
   */
  const emptyActions = (
    <ActionPanel>
      {/*
       * Whatever comes first here is what Return does, and
       * NavigationActions renders nothing at the top level, where
       * there is no parent to go up to and no start to return to. So
       * the first action is chosen deliberately: rebuild when there is
       * no index, since that is what the empty view tells the user to
       * do, and otherwise refresh, which is the cheap way to retry an
       * empty result. Never the hidden-file toggle, which has nothing
       * to do with why the list is empty.
       */}
      {noIndex ? rebuildAction : refreshAction}
      <NavigationActions
        onUp={rowHandlers.onUp}
        onReturnToStart={rowHandlers.onReturnToStart}
      />
      <HiddenFilesAction onToggle={rowHandlers.onToggleHidden} />
      <SearchHistoryActions
        onHistoryBack={rowHandlers.onHistoryBack}
        onHistoryForward={rowHandlers.onHistoryForward}
      />
      {noIndex ? refreshAction : rebuildAction}
      {/* Keep cache recovery available when no rows are shown. */}
      <Action
        title="Delete All Data and Cache…"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={rowHandlers.onEraseEverything}
      />
    </ActionPanel>
  );

  return (
    <SearchScreenContent
      screen={screen}
      frameId={frameId}
      // The List's own panel applies whenever no row owns one. Reuse the
      // deliberate ordering rather than leading with navigation, which renders
      // nothing at the top level and left the hidden-file toggle first.
      actions={emptyActions}
      // Only ever while rows are on screen: see listIsLoading.
      isLoading={listIsLoading(listView, settling)}
      // Raycast's own filter would re-rank by match score and wipe out the
      // usage ranking, so we filter and sort ourselves.
      filtering={false}
      selectedItemId={selectedId ?? undefined}
      onSelectionChange={event("selection", (id: string | null) => {
        if (!navigation.isCurrent(frameId)) return;
        traceSelectionReceived(id);
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
      {listView.kind !== "rows" ? (
        <List.EmptyView
          icon={
            listView.kind === "loading"
              ? Icon.Clock
              : listView.hint === "keys"
                ? Icon.Keyboard
                : Icon.MagnifyingGlass
          }
          title={listView.title}
          description={listView.description}
          actions={emptyActions}
        />
      ) : (
        <List.Section
          title={`${light}  ${compactScopeLabel(sectionTitle)} · ${sectionStatus}`}
        >
          {visibleRows.map(({ entry, score }) => (
            <Row
              key={entry.path}
              id={rowIdForEntry(generation, entry)}
              entry={entry}
              visit={visits[entryStoragePath(entry)]}
              score={score}
              showScore={prefs.showScores}
              columns={columns}
              // Usage metadata is read for a browsed folder's children only.
              usageRead={dir !== undefined}
              showingDetail={showingDetail}
              pinned={pins.includes(entryStoragePath(entry))}
              subtitle={
                dir && path.dirname(entry.path) === dir
                  ? undefined
                  : locationLabel(entry.path)
              }
              handlers={rowHandlers}
            />
          ))}
        </List.Section>
      )}
    </SearchScreenContent>
  );
}

/** Reuse the route's input; replace its result producer for each location. */
function BrowserFrame({
  frame,
  navigation,
  actions,
  active,
  ...session
}: {
  frame: SearchFrame;
  navigation: FolderNavigation;
  actions: FrameActions;
  active: boolean;
  includeHidden: boolean;
  onToggleHidden: () => void;
  reloadKey: number;
  setReloadKey: Dispatch<SetStateAction<number>>;
}) {
  const screen = useMemo(
    () => new SearchScreen(frame.id, frame.initialQuery),
    [frame.id, frame.initialQuery],
  );
  return (
    <>
      <SearchScreenView screen={screen} active={active} />
      {active && (
        <BrowserView
          key={frame.id}
          {...session}
          {...actions}
          screen={screen}
          navigation={navigation}
          frameId={frame.id}
          dir={frame.dir}
          initialSelectionPath={frame.selectedPath}
        />
      )}
    </>
  );
}

/** Only session settings survive replacement of a result view. */
export function Browser() {
  enableNavigationDiagnostics(environment.isDevelopment);
  const [includeHidden, setIncludeHidden] = useState(
    () => getPreferenceValues<Preferences>().showHidden,
  );
  const onToggleHidden = useCallback(
    () => setIncludeHidden((hidden) => !hidden),
    [],
  );
  const [navigation] = useState(() => new FolderNavigation());
  const [reloadKey, setReloadKey] = useState(0);
  const renderFrame = useCallback(
    (frame: SearchFrame, actions: FrameActions, active: boolean) => (
      <BrowserFrame
        frame={frame}
        navigation={navigation}
        actions={actions}
        active={active}
        includeHidden={includeHidden}
        onToggleHidden={onToggleHidden}
        reloadKey={reloadKey}
        setReloadKey={setReloadKey}
      />
    ),
    [navigation, includeHidden, onToggleHidden, reloadKey],
  );
  return (
    <NativeSearchNavigation navigation={navigation} renderFrame={renderFrame} />
  );
}
