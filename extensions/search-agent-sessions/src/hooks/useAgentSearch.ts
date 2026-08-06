import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { loadManifest, refresh } from "../lib/corpus";
import {
  effectiveAgent,
  makeFilter,
  narrows,
  type FilterConfig,
  type FilterState,
} from "../lib/filter";
import { parseQuery, type ParsedQuery } from "../lib/query";
import {
  FLUSH_INTERVAL_MS,
  RESORT_WINDOW_MS,
  ResultStore,
  rowsEqual,
} from "../lib/results";
import {
  projectOptions,
  projectsEqual,
  type ProjectOption,
} from "../lib/projects";
import { search, type SearchHandle } from "../lib/search";
import type { Manifest, Row, SessionMeta } from "../lib/types";

export interface IndexReport {
  rebuilt: boolean;
  filesIndexed: number;
  ms: number;
  sessions: number;
}

export interface AgentSearchState {
  rows: Row[];
  /** Projects to offer in the search-bar dropdown, ranked and capped. */
  projects: ProjectOption[];
  /** The parsed query terms, so callers need not re-parse the raw string. */
  query: ParsedQuery;
  isLoading: boolean;
  indexing: boolean;
  /** Outcome of the background refresh; the view decides how to show it. */
  indexReport?: IndexReport;
  error?: string;
  /** A pass gave up early, so the ranking is missing part of the corpus. */
  truncated: boolean;
  /** Stop re-sorting immediately — the user has moved the selection. */
  freeze(): void;
}

/**
 * @param pinned The key of the session whose detail pane is open, if any. Taken
 * as a ref because the caller can only know it once it has the rows, which is
 * this hook's own output, and because the pin has to be read at flush time
 * rather than at the render that set it.
 */
export function useAgentSearch(
  rawQuery: string,
  config: FilterConfig,
  pinned: RefObject<string | undefined>,
): AgentSearchState {
  const query = useMemo(() => parseQuery(rawQuery), [rawQuery]);
  // A space is a safe separator: parseQuery splits on whitespace, so no word
  // can contain one.
  const wordsKey = query.words.join(" ");

  // The manifest is the previous run's index, and reading it costs a couple of
  // milliseconds against a corpus of two thousand sessions — far less than the
  // empty frame the alternative produces. Loading it here rather than in the
  // mount effect is what lets the state below be seeded during the first render,
  // so the initial commit already carries rows instead of Raycast being handed
  // an empty list and the real one a re-render later.
  const storeRef = useRef<ResultStore | undefined>(undefined);
  const bootRef = useRef<Manifest | undefined>(undefined);
  if (!storeRef.current) {
    bootRef.current = loadManifest();
    storeRef.current = new ResultStore();
    storeRef.current.seed(bootRef.current.sessions);
  }
  const store = storeRef.current;

  // Above the state that reads it: `buildRows` filters through this, so seeding
  // rows with the default allow-everything predicate would show sessions the
  // search root or a restored dropdown scope excludes, only to drop them on the
  // next flush.
  store.allow = useMemo(() => makeFilter(query, config), [query, config]);
  // Beside `allow` because `buildRows` consults both, including in the seeded
  // build below.
  store.pinned = () => pinned.current;

  const [rows, setRows] = useState<Row[]>(() => store.buildRows(true));
  const [projects, setProjects] = useState<ProjectOption[]>(() =>
    projectOptions(store.sessions.values(), config),
  );
  const [searching, setSearching] = useState(false);
  const [indexing, setIndexing] = useState(true);
  const [indexReport, setIndexReport] = useState<IndexReport | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | undefined>(undefined);
  const [truncated, setTruncated] = useState(false);

  const frozen = useRef(false);
  const sessionsDirty = useRef(false);
  // Distinct from `sessionsDirty`, which the scope effect also raises: this one
  // means a refresh handed over a new snapshot, the only case where a row's
  // rendered content can change without its identity changing. Keeping them
  // apart is what stops a scope change from forcing a redundant row re-render.
  const metaDirty = useRef(false);
  // Read by `apply` rather than closed over: `apply` feeds `scheduleFlush` and
  // through it `ingestSessions`, which the mount effect depends on, so taking
  // `config` as a dependency would tear down and restart the corpus refresh
  // every time the user touched the dropdown.
  const configRef = useRef(config);
  configRef.current = config;
  const queryStarted = useRef(Date.now());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const handle = useRef<SearchHandle | undefined>(undefined);
  const lastFilter = useRef<FilterState | undefined>(undefined);

  // Returning the previous array when nothing changed makes React bail out of
  // the render entirely, which is the point: a no-news flush would otherwise
  // re-serialize every visible row across the Raycast bridge 20x a second.
  const apply = useCallback(
    (resort: boolean) => {
      const next = store.buildRows(resort);
      // `rowsEqual` is blind to the indexer's in-place metadata updates (see its
      // note), so a new snapshot has to skip it. Search flushes never touch
      // sessions, which is the 20-per-second case the bail-out exists for.
      const snapshotChanged = metaDirty.current;
      metaDirty.current = false;
      setRows((prev) =>
        !snapshotChanged && rowsEqual(prev, next) ? prev : next,
      );
      // Derived here rather than in the view for the same reason the rows are.
      // `refresh` reports once per corpus batch, hundreds of times on a cold
      // index, and the projects in it settle within the first few. The view
      // would need a fresh array each time, since `refresh` reuses one session
      // array (see `RefreshOptions.onSessions`), and that re-renders the whole
      // command on every batch, defeating the bail-out above on exactly the
      // flushes it was written for.
      if (sessionsDirty.current) {
        sessionsDirty.current = false;
        const options = projectOptions(
          store.sessions.values(),
          configRef.current,
        );
        setProjects((prev) => (projectsEqual(prev, options) ? prev : options));
      }
    },
    [store],
  );

  const flushNow = useCallback(
    (resort: boolean) => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        flushTimer.current = undefined;
      }
      apply(resort);
    },
    [apply],
  );

  /**
   * Coalesces bursts of streamed hits into one render per interval. The first
   * row of a query skips the throttle so the list paints as soon as anything
   * matches; everything after it batches. No results on screen means the query
   * reset just cleared them, so every new query paints immediately — and the
   * pinned row does not count as a result, since it is the one row that was
   * already there.
   */
  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) return;
    const empty =
      store.order.length === 0 ||
      (store.order.length === 1 && store.order[0] === store.pinned());
    const delay = empty ? 0 : FLUSH_INTERVAL_MS;
    flushTimer.current = setTimeout(() => {
      flushTimer.current = undefined;
      const resort =
        !frozen.current && Date.now() - queryStarted.current < RESORT_WINDOW_MS;
      apply(resort);
    }, delay);
  }, [apply, store]);

  const ingestLines = useCallback(
    (lines: string[]) => {
      if (store.ingestLines(lines)) scheduleFlush();
    },
    [scheduleFlush, store],
  );

  // A rebuild reports its progress as a list that starts empty and grows, so
  // replacing the snapshot with one of those would collapse the seeded list to
  // the handful re-indexed so far and then regrow it over the whole pass. Those
  // batches merge; the authoritative ones replace, which is what still drops
  // sessions whose transcript is gone.
  const ingestSessions = useCallback(
    (list: SessionMeta[], authoritative: boolean) => {
      if (authoritative) store.seed(list);
      else store.merge(list);
      sessionsDirty.current = true;
      metaDirty.current = true;
      scheduleFlush();
    },
    [scheduleFlush, store],
  );

  // Widening or narrowing the reachable corpus changes which projects exist,
  // and no new sessions arrive to mark the list stale, so mark it here.
  useEffect(() => {
    sessionsDirty.current = true;
    scheduleFlush();
  }, [config, scheduleFlush]);

  // Bring the corpus up to date in the background, starting from the manifest
  // the store was already seeded with — re-reading 800KB of JSON here would
  // parse the same document twice. The refresh streams newly appended lines
  // straight into the live result set, so a query typed during indexing keeps
  // gaining results without restarting.
  useEffect(() => {
    // Consumed, not just read: releasing it lets the pre-refresh session objects
    // be collected once a rebuild replaces them, and leaves the fallback live so
    // a re-run — StrictMode mounts this effect twice under `ray develop` — reads
    // a manifest that reflects whatever the previous pass wrote.
    const manifest = bootRef.current ?? loadManifest();
    bootRef.current = undefined;
    let cancelled = false;
    // Deferred by a turn of the event loop rather than started here. `refresh`
    // is async but its opening stretch is not: it stats every transcript before
    // reaching its first yield, which on a cold filesystem cache is far longer
    // than the render we just committed takes to reach Raycast. Running it
    // inside the effect puts that work in front of the paint it is feeding.
    const start = setTimeout(() => {
      refresh({
        manifest,
        onSessions: ingestSessions,
        onLines: ingestLines,
        cancelled: () => cancelled,
      })
        .then((result) => {
          if (cancelled) return;
          setIndexReport({
            rebuilt: result.rebuilt,
            filesIndexed: result.filesIndexed,
            ms: result.ms,
            sessions: result.sessions.length,
          });
          setIndexing(false);
        })
        .catch((e: Error) => {
          if (cancelled) return;
          setError(e.message);
          setIndexing(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [ingestSessions, ingestLines]);

  // A new query, or a filter change that widens what is worth scoring, resets
  // the accumulator and restarts both ripgrep passes, because ingest skips
  // scoring for filtered-out sessions and a widened filter has nothing stored to
  // re-select from. A narrowed one already has what it needs: `store.allow` is
  // the new predicate and `buildRows` re-applies it, so only the rows need
  // re-deriving. The filter never reaches ripgrep, so restarting re-scans the
  // whole corpus to deliver an identical line stream, and picking from a
  // dropdown of dozens of projects is a routine narrowing.
  //
  // `config` stands in for its own fields: the caller memoizes it, which
  // `store.allow` above already depends on. Only the query half needs a manual
  // key, because `query` is rebuilt on every keystroke. Serializing the config
  // fields by hand instead meant a new one had to be remembered here, and a
  // separator that is legal inside a path could shift the field boundaries; the
  // state below is rebuilt from those same primitives so that a keystroke which
  // leaves the filter alone restarts nothing.
  const dirsKey = query.dirs.join(",");
  const queryAgent = query.agent;
  useEffect(() => {
    const next: FilterState = {
      words: wordsKey,
      dirs: dirsKey ? dirsKey.split(",") : [],
      agent: effectiveAgent(queryAgent, config.agentOverride),
      projectPath: config.projectPath,
      includeOutsideRoot: config.includeOutsideRoot,
    };
    const previous = lastFilter.current;
    lastFilter.current = next;

    // Only once the sweep has finished. React runs the previous cleanup before
    // this effect, so an in-flight search has already been cancelled by the time
    // we get here, and skipping the restart would strand it half-swept.
    if (previous && !store.sweeping && narrows(previous, next)) {
      frozen.current = false;
      queryStarted.current = Date.now();
      flushNow(true);
      return;
    }

    handle.current?.cancel();
    handle.current = undefined;
    frozen.current = false;
    queryStarted.current = Date.now();
    store.startQuery(wordsKey ? wordsKey.split(" ") : []);
    setError(undefined);
    setTruncated(false);

    // One fact with two readers: the spinner reads React state, the pinned row's
    // grace period reads the store. Written together so that an exit added later
    // cannot leave a row pinned to a sweep that is over.
    const sweeping = (active: boolean) => {
      store.sweeping = active;
      setSearching(active);
    };

    if (store.words.length === 0) {
      sweeping(false);
      flushNow(true);
      return;
    }

    sweeping(true);
    flushNow(true);
    const running = search(store.words, {
      onLines: ingestLines,
      onPassDone: () => scheduleFlush(),
      onTruncated: () => setTruncated(true),
      onDone: () => {
        sweeping(false);
        scheduleFlush();
      },
      onError: (e) => {
        sweeping(false);
        setError(e.message);
      },
    });
    handle.current = running;

    // One guaranteed sorted snapshot as the free-reorder window closes, so late
    // arrivals inside the window cannot leave the list unsorted.
    const settle = setTimeout(() => {
      if (!frozen.current) flushNow(true);
    }, RESORT_WINDOW_MS);

    return () => {
      clearTimeout(settle);
      running.cancel();
    };
  }, [
    wordsKey,
    config,
    dirsKey,
    queryAgent,
    ingestLines,
    scheduleFlush,
    flushNow,
    store,
  ]);

  useEffect(() => () => clearTimeout(flushTimer.current), []);

  const freeze = useCallback(() => {
    frozen.current = true;
  }, []);

  return {
    rows,
    projects,
    query,
    isLoading: searching || indexing,
    indexing,
    indexReport,
    error,
    truncated,
    freeze,
  };
}
