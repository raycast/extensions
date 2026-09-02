import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  closeMainWindow,
  Toast,
  getPreferenceValues,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import os from "node:os";
import path from "node:path";
import { Entry, Prefs, SORT_MODES, SortMode, VisitLog } from "../lib/types";
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
  hiddenDirsMatching,
  isDirectory,
  normalizeDir,
  readDirectory,
  locationLabel,
  relativeDepth,
  sharedCloudFolders,
  splitPathQuery,
  statEntry,
  standardPlaces,
} from "../lib/read-dir";
import { readUsageMetaResult, searchPathResult } from "../lib/spotlight";
import { isUnindexedScope, listUnder, walkSearch } from "../lib/walk";
import { loadShortcutIndex, saveShortcutIndex } from "../lib/shortcut-index";
import { scanShortcuts } from "../lib/drive-shortcuts";
import { loadSharedIndex, saveSharedIndex } from "../lib/shared-index";
import { loadDiscovered, rememberDiscovered } from "../lib/discovered";
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
} from "../lib/query";
import { Row, RowHandlers } from "./row";
import { entryStoragePath, rowIdForEntry } from "../lib/entry-identity";
import { relativeTime } from "../lib/format";

/** Minimum query lengths before Spotlight runs. */
const MIN_QUERY_GLOBAL = 3;
const MIN_QUERY_SCOPED = 2;
/** Limits overlapping Spotlight processes while typing. */
const DEBOUNCE_MS = 420;
/** How long a query must sit unchanged before it is remembered as history. */
const HISTORY_SETTLE_MS = 1500;
/** How many Spotlight hits survive the coarse pass and get stat()ed. */
const SHORTLIST = 60;

type Props = {
  /** Search scope; undefined searches all indexed locations. */
  dir?: string;
  /** Navigation depth; zero is the command's root screen. */
  depth?: number;
};

type Ranked = { entry: Entry; tier: number; score: ScoreParts };

export function Browser({ dir: rawDir, depth = 0 }: Props) {
  const dir = rawDir === undefined ? undefined : normalizeDir(rawDir);
  const prefs = getPreferenceValues<Prefs>();
  const { push } = useNavigation();

  const [searchText, setSearchText] = useState("");
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
  const [sortMode, setSortMode] = useState<SortMode>("usage");
  const [showingDetail, setShowingDetail] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  /** True until scoped entries receive cached or fresh usage metadata. */
  const [childrenUsagePending, setChildrenUsagePending] = useState(false);
  const [folderError, setFolderError] = useState<string>();
  const [folderMetaError, setFolderMetaError] = useState<string>();
  const [folderMetaPartial, setFolderMetaPartial] = useState<string>();

  /** Prevents history navigation from resetting its own cursor. */
  const programmaticEdit = useRef(false);

  const query = searchText.trim();
  /** A leading / or ~/ activates the path bar in global mode. */
  const pathQuery = dir ? undefined : splitPathQuery(searchText);
  /** Name fragment used by path-bar results. */
  const effectiveQuery = pathQuery ? pathQuery.prefix : query;
  const parsed = useMemo(() => parseQuery(searchText), [searchText]);
  // Dot-prefixed queries temporarily include hidden entries.
  const showHidden = prefs.showHidden || parsed.hidden;
  const minQuery = dir ? MIN_QUERY_SCOPED : MIN_QUERY_GLOBAL;
  const places = useMemo(() => standardPlaces(), []);
  const [sharedFolders, setSharedFolders] = useState<Entry[]>([]);
  const [shortcuts, setShortcuts] = useState<Entry[]>([]);
  const [shortcutsScannedAt, setShortcutsScannedAt] = useState(0);
  const [driveIndexMessage, setDriveIndexMessage] = useState<string>();
  /** Paths in Google Drive shared folders that Spotlight cannot index. */
  const [sharedIndex, setSharedIndex] = useState<string[]>([]);
  /** Paths earlier Spotlight passes surfaced. See lib/discovered.ts. */
  const [discovered, setDiscovered] = useState<string[]>([]);
  /** Defers discovered paths until the next query to preserve row identity. */
  const discoveredRef = useRef<string[]>([]);

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
    void (async () => {
      const [v, p] = await Promise.all([loadVisitLog(), loadPins()]);
      setVisitLog(v);
      setPins(p);
      setIsLoading(false);
    })();
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    setBackgroundPending(true);
    void (async () => {
      try {
        setHistory(await loadSearches());

        const index = await loadShortcutIndex();
        if (cancelled) return;
        setShortcuts(
          index.shortcuts
            .map((sc) => statEntry(sc.path))
            .filter((e): e is Entry => e !== undefined),
        );
        setShortcutsScannedAt(index.scannedAt);
        const shared = loadSharedIndex();
        setDriveIndexMessage(driveIndexCaveat(index, shared));
        setAbbreviations(await loadAbbreviations());
        setDiscovered(loadDiscovered());
        setSharedIndex(shared.paths);
      } finally {
        if (!cancelled) setBackgroundPending(false);
      }
    })();
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
    let cancelled = false;
    const read = readDirectory(dir, showHidden);
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
      const result = await readUsageMetaResult(missing);
      if (cancelled) return;
      setChildrenUsagePending(false);
      setFolderMetaError(result.error);
      setFolderMetaPartial(result.partial);
      const meta = result.meta;
      if (meta.size === 0) return;
      writeCachedUsage(dir, new Map([...cached, ...meta]));
      setChildren((prev) =>
        prev.map((e) => {
          const m = meta.get(e.path);
          return m ? { ...e, ...m } : e;
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [dir, showHidden, reloadKey]);

  // Rank paths first, then stat only the best Spotlight candidates.
  useEffect(() => {
    setFoundUsagePending(false);
    setFoundUsageError(undefined);
    setFoundUsagePartial(undefined);
    setSearchError(undefined);
    if (pathQuery || parsed.longest.length < minQuery) {
      setFound([]);
      setSearching(false);
      setResultsTruncated(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setResultsTruncated(false);

    const timer = setTimeout(() => {
      void (async () => {
        // Walk shared Drive folders directly because Spotlight cannot index them.
        const walking = dir !== undefined && isUnindexedScope(dir);
        let paths: string[];
        let truncated = false;
        let failure: string | undefined;
        if (walking) {
          const result = await walkSearch(dir, parsed, {
            showHidden,
            isCancelled: () => cancelled,
          });
          paths = result.paths;
          truncated = result.truncated;
          failure = result.error;
        } else {
          const result = await searchPathResult(parsed.longest, {
            scope: dir,
            showHidden,
          });
          paths = result.paths;
          truncated = result.truncated;
          failure = result.error;
          // Expand matching folders when file-only filters exclude the folder.
          if (excludesDirectories(parsed)) {
            const dirs = paths.filter((p) => isDirectory(p));
            if (dirs.length > 0 && !cancelled) {
              const inside = await listUnder(dirs, {
                showHidden,
                isCancelled: () => cancelled,
              });
              truncated ||= inside.truncated;
              failure ??= inside.error;
              paths = [...new Set([...paths, ...inside.paths])];
            }
          }
        }

        // Walk hidden roots directly; Spotlight does not index hidden entries.
        const dotted = dottedTerms(parsed);
        if (dotted.length > 0 && !cancelled) {
          const roots = hiddenDirsMatching(dir ?? os.homedir(), dotted);
          if (roots.length > 0) {
            const inside = await listUnder(roots, {
              showHidden: true,
              maxDepth: 4,
              limit: 12_000,
              budgetMs: 1500,
              isCancelled: () => cancelled,
            });
            truncated ||= inside.truncated;
            failure ??= inside.error;
            paths = [...new Set([...paths, ...roots, ...inside.paths])];
          }
        }
        if (cancelled) return;
        setResultsTruncated(truncated);
        setSearchError(failure);

        const ranked = paths
          .filter((p) => !dir || path.dirname(p) !== dir) // Already listed as children.
          .flatMap((p) => {
            const tier = matchPath(parsed, p);
            if (tier === undefined) return [];
            return [
              {
                path: p,
                tier,
                coarse: coarseScore(
                  visits[p],
                  tick,
                  dir ? relativeDepth(dir, p) : 0,
                ),
              },
            ];
          })
          .sort((a, b) =>
            a.tier !== b.tier ? a.tier - b.tier : b.coarse - a.coarse,
          );

        // Continue until SHORTLIST entries survive type and stat filters.
        const shortlist: Entry[] = [];
        for (const r of ranked) {
          if (shortlist.length >= SHORTLIST) break;
          const entry = statEntry(r.path);
          if (!entry) continue;
          if (
            matchPath(parsed, entry.path, entry.isDirectory) === undefined ||
            !matchesStats(parsed, entry)
          ) {
            continue;
          }
          shortlist.push(entry);
        }

        // Cache matched paths for faster follow-up queries.
        discoveredRef.current = rememberDiscovered(ranked.map((r) => r.path));
        setFound(shortlist);
        setSearching(false);

        // Usage enrichment can reorder results after discovery finishes.
        if (shortlist.length === 0) return;
        setFoundUsagePending(true);
        try {
          const result = await readUsageMetaResult(
            shortlist.map((e) => e.path),
          );
          if (cancelled) return;
          setFoundUsageError(result.error);
          setFoundUsagePartial(result.partial);
          const meta = result.meta;
          if (meta.size === 0) return;
          setFound((prev) =>
            prev.map((e) => {
              const m = meta.get(e.path);
              return m ? { ...e, ...m } : e;
            }),
          );
        } finally {
          if (!cancelled) setFoundUsagePending(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Visit changes affect local ranking and should not rerun Spotlight.
  }, [dir, query, minQuery, pathQuery !== undefined, showHidden, reloadKey]);

  /** Pinned, frequently used, and standard locations shown for an empty query. */
  const startingPoints = useMemo(() => {
    if (dir) return [];
    const seen = new Set<string>();
    const out: Entry[] = [];

    const add = (target: string) => {
      if (seen.has(target)) return;
      seen.add(target);
      const entry = statEntry(target);
      if (entry) out.push(entry);
    };

    for (const p of pins) add(p);
    for (const [target] of Object.entries(visits)
      .map(([t, v]) => [t, visitScore(v, tick)] as const)
      .filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40))
      add(target);
    for (const place of places) add(place.path);

    return out;
    // Keep candidates stable and filter them in memory as the query changes.
  }, [dir, pins, visits, places, tick]);

  /** Previously-surfaced paths, matched in memory. See lib/discovered.ts. */
  const discoveredMatches = useMemo(() => {
    if (query === "" || discovered.length === 0) return [];
    const graded: { path: string; tier: number }[] = [];
    for (const p of discovered) {
      if (dir && !p.startsWith(dir + "/")) continue;
      const tier = matchPath(parsed, p);
      if (tier !== undefined) graded.push({ path: p, tier });
    }
    graded.sort((a, b) => a.tier - b.tier);

    const out: Entry[] = [];
    for (const g of graded) {
      if (out.length >= SHORTLIST) break;
      const entry = statEntry(g.path);
      if (!entry) continue;
      if (
        matchPath(parsed, entry.path, entry.isDirectory) === undefined ||
        !matchesStats(parsed, entry)
      ) {
        continue;
      }
      out.push(entry);
    }
    return out;
  }, [dir, query, parsed, discovered]);

  /** Matches from the Google Drive shared-folder index. */
  const sharedMatches = useMemo(() => {
    if (dir || query === "" || sharedIndex.length === 0) return [];
    // Rank the full index before taking the shortlist.
    const graded: { path: string; tier: number }[] = [];
    for (const p of sharedIndex) {
      const tier = matchPath(parsed, p);
      if (tier !== undefined) graded.push({ path: p, tier });
    }
    graded.sort((a, b) => a.tier - b.tier);

    const out: Entry[] = [];
    for (const g of graded) {
      if (out.length >= SHORTLIST) break;
      const entry = statEntry(g.path);
      if (!entry) continue;
      if (
        matchPath(parsed, entry.path, entry.isDirectory) === undefined ||
        !matchesStats(parsed, entry)
      ) {
        continue;
      }
      out.push(entry);
    }
    return out;
  }, [dir, query, parsed, sharedIndex]);

  /** Paths you have previously chosen after typing this exact query. */
  const learnedPaths = useMemo(
    () => Object.keys(abbreviations[parsed.normalized] ?? {}),
    [abbreviations, parsed.normalized],
  );

  const learnedSet = useMemo(() => new Set(learnedPaths), [learnedPaths]);

  const learnedMatches = useMemo(
    () =>
      learnedPaths
        .map((p) => statEntry(p))
        .filter((e): e is Entry => e !== undefined),
    [learnedPaths],
  );

  /** Hidden Home entries shown for a bare dot in global mode. */
  const hiddenHome = useMemo(() => {
    if (dir || pathQuery || !hiddenOnly(parsed)) return [];
    return readDirectory(os.homedir(), true).entries;
  }, [dir, pathQuery, parsed]);

  /** Children of the typed directory, plus the directory itself if it exists. */
  const pathListing = useMemo(() => {
    if (!pathQuery)
      return {
        rows: [] as Entry[],
        omitted: 0,
        error: undefined as string | undefined,
      };
    const out: Entry[] = [];
    const exact =
      pathQuery.prefix === ""
        ? pathQuery.dir
        : path.join(pathQuery.dir, pathQuery.prefix);
    const self = statEntry(exact);
    if (self) out.push(self);
    const listing = readDirectory(pathQuery.dir, showHidden);
    out.push(...listing.entries);
    return { rows: out, omitted: listing.truncated, error: listing.error };
    // Use split values because pathQuery is recreated on every render.
  }, [pathQuery?.dir, pathQuery?.prefix, showHidden]);
  const pathRows = pathListing.rows;

  const compare = useCallback(
    (a: Ranked, b: Ranked) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      switch (sortMode) {
        case "modified":
          return b.entry.mtimeMs - a.entry.mtimeMs;
        case "created":
          return b.entry.birthtimeMs - a.entry.birthtimeMs;
        case "size":
          return b.entry.size - a.entry.size;
        case "name":
          return a.entry.name.localeCompare(b.entry.name, undefined, {
            numeric: true,
          });
        default:
          if (b.score.total !== a.score.total)
            return b.score.total - a.score.total;
          return a.entry.name.localeCompare(b.entry.name, undefined, {
            numeric: true,
          });
      }
    },
    [sortMode],
  );

  /** Ranks and deduplicates candidates; exclude removes rows already shown. */
  const rankSources = useCallback(
    (sources: Entry[], exclude?: Set<string>) => {
      const now = Date.now();
      const byPath = new Map<string, Entry>();
      for (const entry of sources) {
        if (exclude?.has(entry.path)) continue;
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
    [learnedSet, pathQuery, visits, tick, effectiveQuery, parsed, dir, compare],
  );

  /** Results available without a new Spotlight query. */
  const instantRows = useMemo(() => {
    if (pathQuery) return rankSources(pathRows);
    return rankSources([
      ...children,
      ...startingPoints,
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
    query,
    sharedFolders,
    shortcuts,
    sharedMatches,
    discoveredMatches,
    learnedMatches,
    hiddenHome,
  ]);

  /** Delayed search results not already shown in instantRows. */
  const spotlightRows = useMemo(() => {
    if (pathQuery || found.length === 0) return [];
    const already = new Set(instantRows.map((r) => r.entry.path));
    return rankSources(found, already);
  }, [rankSources, pathQuery, found, instantRows]);

  // Merge all sources into one ranked list.
  const rows = useMemo(
    () => [...instantRows, ...spotlightRows].sort(compare),
    [instantRows, spotlightRows, compare],
  );

  const markVisited = useCallback(async (target: string) => {
    setVisitLog(await recordVisit(target));
  }, []);

  /** Records a query and optionally learns its selected target. */
  const commitSearch = useCallback(
    async (target?: string) => {
      if (query === "") return;
      setHistory(await recordSearch(query));
      if (target !== undefined) {
        setAbbreviations(await recordAbbreviation(parsed.normalized, target));
      }
    },
    [query, parsed.normalized],
  );

  // Record settled queries without storing every typed prefix.
  useEffect(() => {
    if (query.length < minQuery || pathQuery) return;
    const timer = setTimeout(() => {
      void recordSearch(query).then(setHistory);
    }, HISTORY_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [query, minQuery, pathQuery]);

  const setQueryProgrammatically = useCallback((next: string) => {
    programmaticEdit.current = true;
    setSearchText(next);
  }, []);

  const parent = dir ? path.dirname(dir) : undefined;

  const handlers: RowHandlers = useMemo(
    () => ({
      onOpen: async (entry) => {
        // Persist ranking signals before the command closes.
        await markVisited(entry.path);
        await commitSearch(entry.path);
        await closeMainWindow();
        await open(entry.path);
      },
      onDescend: (entry) => {
        void markVisited(entry.path);
        void commitSearch(entry.path);
        push(<Browser dir={entry.path} depth={depth + 1} />);
      },
      // Push the parent so Escape still returns to the current folder.
      onUp:
        dir && parent && parent !== dir
          ? () => push(<Browser dir={parent} depth={depth + 1} />)
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
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Indexing Google Drive…",
        });
        // Bound interactive indexing so a cold mount cannot block indefinitely.
        const previousShortcuts = await loadShortcutIndex();
        const index = await scanShortcuts({ maxDepth: 6, budgetMs: 20_000 });
        if (
          shouldReplaceIndex(
            previousShortcuts.shortcuts.length,
            index.available,
          )
        ) {
          await saveShortcutIndex(index);
        }
        if (!index.available) {
          toast.style = Toast.Style.Failure;
          toast.title = "Google Drive is unavailable";
          toast.message = "The previous index was kept.";
          return;
        }
        setShortcuts(
          index.shortcuts
            .map((sc) => statEntry(sc.path))
            .filter((e): e is Entry => e !== undefined),
        );
        setShortcutsScannedAt(index.scannedAt);

        const previousShared = loadSharedIndex();
        const shared = await scanSharedFolders({ budgetMs: 20_000 });
        if (shouldReplaceIndex(previousShared.paths.length, shared.available)) {
          saveSharedIndex(shared);
        }
        if (!shared.available) {
          toast.style = Toast.Style.Failure;
          toast.title = "Google Drive shared folders are unavailable";
          toast.message = "The previous index was kept.";
          return;
        }
        setSharedIndex(shared.paths);
        const indexCaveat = driveIndexCaveat(index, shared);
        setDriveIndexMessage(indexCaveat);

        toast.style = Toast.Style.Success;
        toast.title = `${shared.paths.length} items in shared folders`;
        toast.message = indexCaveat
          ? `${index.shortcuts.length} shortcuts. ${indexCaveat}.`
          : `${index.shortcuts.length} shortcuts indexed.`;
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
        // Rebuild component state from the cleared stores.
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
      depth,
      history,
      historyIndex,
      query,
      parsed.normalized,
      shortcuts,
      shortcutsScannedAt,
      markVisited,
      commitSearch,
      setQueryProgrammatically,
      push,
    ],
  );

  // Reset row IDs and publish paths discovered by the previous query.
  useEffect(() => {
    setGeneration((g) => g + 1);
    setDiscovered(discoveredRef.current);
  }, [parsed.normalized, dir]);

  const onSearchTextChange = useCallback((next: string) => {
    if (programmaticEdit.current) programmaticEdit.current = false;
    else setHistoryIndex(-1);
    setSearchText(next);
  }, []);

  const rankingReady = !isLoading;

  // All search-status indicators derive from this shared progress model.
  const progress = deriveProgress({
    rankingReady,
    backgroundPending,
    scoped: dir !== undefined,
    folderMetaPending: childrenUsagePending,
    folderFailed:
      folderError !== undefined ||
      folderMetaError !== undefined ||
      pathListing.error !== undefined,
    folderPartial: folderMetaPartial !== undefined,
    isPathQuery: pathQuery !== undefined,
    query,
    isHiddenOnly: hiddenOnly(parsed),
    searching,
    searchFailed: searchError !== undefined,
    termLength: parsed.longest.length,
    minQuery,
    rankingPending: foundUsagePending,
    rankingFailed: foundUsageError !== undefined,
    rankingPartial: foundUsagePartial !== undefined,
  });
  const settling = !isSettled(progress);
  const light = statusLight(progress);

  // Report incomplete results separately from progress completion.
  const omittedEntries = pathQuery ? pathListing.omitted : folderEntriesOmitted;
  const caveat = folderError
    ? "this folder could not be read"
    : pathListing.error
      ? "this location could not be read"
      : searchError
        ? searchError
        : folderMetaError
          ? folderMetaError
          : folderMetaPartial
            ? folderMetaPartial
            : foundUsageError
              ? foundUsageError
              : foundUsagePartial
                ? foundUsagePartial
                : omittedEntries > 0
                  ? `${omittedEntries} folder entries omitted at the list limit`
                  : resultsTruncated
                    ? "search reached a time, depth, or result limit"
                    : !dir && query !== "" && driveIndexMessage
                      ? driveIndexMessage
                      : dir && isUnindexedScope(dir)
                        ? "read directly, not in Spotlight's index"
                        : undefined;
  const orderingLabel = (() => {
    if (pathQuery) return "folders at this location";
    if (hiddenOnly(parsed)) return "hidden files and folders";
    const only =
      parsed.type === "directory"
        ? "folders only · "
        : parsed.type === "file"
          ? "files only · "
          : "";
    if (only !== "" && query !== "") {
      return `${only}best matches, then most-used`;
    }
    if (sortMode !== "usage") {
      const chosen = SORT_MODES.find((m) => m.value === sortMode);
      return `sorted by ${chosen?.title.toLowerCase() ?? sortMode}`;
    }
    if (query === "" && !dir) return "what you use most, and your usual places";
    // Textual match tier precedes usage score for non-empty queries.
    if (query !== "") {
      if (dir && isUnindexedScope(dir)) {
        return resultsTruncated
          ? "reading this shared folder — showing what was found so far"
          : "reading this shared folder directly (it is not indexed)";
      }
      return "best name matches, then most-used";
    }
    return "most-used first";
  })();

  const scopeLabel = dir ? displayPath(dir) : "Everywhere";
  const tooShort = !pathQuery && query !== "" && query.length < minQuery;

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
    settling ? `${rows.length} so far` : `${rows.length}`,
    light === "🟢" ? "complete" : describeProgress(progress),
    caveat,
    settling ? undefined : orderingLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <List
      // Keep the progress bar active while any stage can reorder results.
      isLoading={!rankingReady || settling}
      // Raycast's own filter would re-rank by match score and wipe out the
      // usage ranking, so we filter and sort ourselves.
      filtering={false}
      searchText={searchText}
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder={
        dir
          ? `Search in ${path.basename(dir) || dir} and below…`
          : "Search files and folders everywhere…"
      }
      // Nested screens use the folder name; Raycast names the root screen.
      navigationTitle={
        depth > 0 ? path.basename(dir ?? "") || scopeLabel : undefined
      }
      isShowingDetail={showingDetail && rows.length > 0}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort by"
          value={sortMode}
          onChange={(v) => setSortMode(v as SortMode)}
        >
          {SORT_MODES.map((m) => (
            <List.Dropdown.Item key={m.value} title={m.title} value={m.value} />
          ))}
        </List.Dropdown>
      }
    >
      {!rankingReady ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="Loading your usage history…"
          description="Nothing can be ranked until it is read."
        />
      ) : rows.length === 0 && !searching ? (
        <List.EmptyView
          icon={tooShort ? Icon.Keyboard : Icon.MagnifyingGlass}
          title={
            folderError
              ? "Folder could not be read"
              : pathListing.error
                ? "Location could not be read"
                : searchError
                  ? "Search failed"
                  : tooShort
                    ? `Keep typing — ${minQuery} characters minimum`
                    : query === ""
                      ? "Nothing to show yet"
                      : `Nothing matching “${query}”`
          }
          description={
            folderError
              ? "Check that the folder still exists and that Raycast can access it."
              : pathListing.error
                ? "Check that the location still exists and that Raycast can access it."
                : searchError
                  ? "Check Spotlight and Raycast permissions, then try Refresh."
                  : tooShort
                    ? `The fast results are here already; a whole-disk search waits for ${minQuery} characters.`
                    : shortcutsScannedAt === 0
                      ? `Searched ${scopeLabel}. Google Drive is not indexed yet — run Index Google Drive from this panel.`
                      : `Searched ${scopeLabel}. Drive shortcuts last indexed ${relativeTime(shortcutsScannedAt)}.`
          }
          actions={
            <ActionPanel>
              {handlers.onUp && (
                <Action
                  title="Go to Parent Folder"
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                  onAction={handlers.onUp}
                />
              )}
              <Action
                title="Previous Search"
                icon={Icon.ArrowLeftCircle}
                shortcut={{ modifiers: ["cmd"], key: "[" }}
                onAction={handlers.onHistoryBack}
              />
              <Action
                title="Next Search"
                icon={Icon.ArrowRightCircle}
                shortcut={{ modifiers: ["cmd"], key: "]" }}
                onAction={handlers.onHistoryForward}
              />
              <Action
                title="Index Google Drive"
                icon={Icon.HardDrive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                onAction={handlers.onReindexShortcuts}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={handlers.onRefresh}
              />
              {/* Keep cache recovery available when no rows are shown. */}
              <Action
                title="Delete All Data and Cache…"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={handlers.onEraseEverything}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title={`${light}  ${sectionTitle}`}
          subtitle={sectionStatus}
        >
          {rows.map(({ entry, score }) => (
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
              handlers={handlers}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
