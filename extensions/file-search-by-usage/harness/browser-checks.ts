import fs from "node:fs";
import { transformSync } from "esbuild";
import { between, locate, through } from "./source-slice";
import path from "node:path";
import * as queryTools from "../src/lib/query";
import { stepSearchHistory } from "../src/lib/search-history";
import { rankSources } from "../src/lib/rank-sources";
import { Entry } from "../src/lib/types";
import { createRecentValidator } from "../src/lib/recent-validation";
import * as searchLimits from "../src/lib/search-limits";
import { sortChecks } from "./sort-checks";
import { folderSelectionChecks } from "./folder-selection-checks";
import { navigationMemoryChecks } from "./navigation-memory-checks";
import { navigationStackChecks } from "./navigation-stack-checks";
import { listRenderChecks } from "./list-render-checks";
import { displayRows } from "../src/lib/display-rows";
import { folderUsageChecks } from "./folder-usage-checks";
import { deriveProgress, rowsCanChange } from "../src/lib/progress";
import * as React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";

/** Exercise the browser's real storage effect with controlled late responses. */
export async function browserChecks(
  assert: (ok: boolean, label: string) => void,
) {
  await sortChecks(assert);
  await folderUsageChecks(assert);
  await folderSelectionChecks(assert);
  await listRenderChecks(assert);
  await navigationMemoryChecks(assert);
  await navigationStackChecks(assert);
  const source = fs.readFileSync("src/components/browser.tsx", "utf8");
  const progressCode = transformSync(
    between(source, "  const progress = deriveProgress", "  const settling ="),
    { loader: "ts" },
  ).code;
  const readyDeps = {
    deriveProgress,
    rankingReady: true,
    backgroundPending: false,
    cachedPending: false,
    cachedPartial: false,
    dir: "/folder",
    hiddenOnly: () => false,
    parsed: { longest: "" },
    directoryPending: false,
    visibleFolderError: undefined,
    pathListing: { omitted: 0 },
    directoryListing: { entries: [{}], truncated: 0 },
    hiddenListing: { truncated: 0 },
    pathQuery: undefined,
    query: "",
    searching: false,
    searchError: undefined,
    searchPartial: undefined,
    searchLimitReached: false,
    minQuery: 3,
  };
  const readyProgress = (extra = {}) => {
    const deps = { ...readyDeps, ...extra };
    return new Function(
      ...Object.keys(deps),
      progressCode + "\nreturn progress;",
    )(...Object.values(deps));
  };
  assert(
    rowsCanChange(readyProgress({ directoryPending: true })),
    "folder readiness waits for the initial directory read",
  );
  assert(
    !rowsCanChange(readyProgress()),
    "a synchronously prepared child snapshot publishes without an extra effect or usage warmup",
  );
  const visibilityCode = between(
    source,
    "  const showHidden =",
    "  const scopeController =",
  );
  const visibility = new Function(
    "prefs",
    "includeHidden",
    "parsed",
    visibilityCode + "\nreturn showHidden;",
  );
  assert(
    !visibility({ showHidden: true }, false, { hidden: false }),
    "session visibility can override the saved show-hidden preference",
  );
  assert(
    visibility({ showHidden: false }, true, { hidden: false }),
    "session visibility enables hidden discovery",
  );
  assert(
    visibility({ showHidden: false }, false, { hidden: true }),
    "dot-prefixed queries still request hidden matches",
  );
  /*
   * The empty view's action panel, evaluated from source.
   *
   * NavigationActions renders nothing at the top level, since there is no
   * parent to go up to and no start to return to. That made the hidden-file
   * toggle the first action, so Return toggled hidden files on a screen whose
   * own message says to rebuild the index.
   */
  type ActionNode = {
    type: unknown;
    props: Record<string, unknown>;
    children: ActionNode[];
  };
  const element = (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: ActionNode[]
  ): ActionNode => ({ type, props: props ?? {}, children });
  const loadActionComponent = (file: string, name: string) => {
    const loaded = { exports: {} as Record<string, unknown> };
    const code = transformSync(fs.readFileSync(file, "utf8"), {
      loader: "tsx",
      format: "cjs",
      jsxFactory: "element",
      jsxFragment: "fragment",
    }).code;
    new Function("require", "module", "exports", "element", "fragment", code)(
      () => ({
        Action: "action",
        Icon: {},
        Keyboard: { Shortcut: { Common: { MoveUp: {}, Refresh: {} } } },
      }),
      loaded,
      loaded.exports,
      element,
      "fragment",
    );
    return loaded.exports[name];
  };
  const render = (node: ActionNode): ActionNode[] =>
    !node || typeof node !== "object"
      ? []
      : typeof node.type === "function"
        ? render(node.type(node.props))
        : [node, ...node.children.flatMap(render)];

  /*
   * A list section is never rendered with no rows in it.
   *
   * The branch used to choose on `rows`, while the rows themselves were gated
   * on the view being active. A view on its way out therefore rendered a
   * section containing nothing: a blank screen, no message, and no empty view
   * to explain it.
   */
  assert(
    /listView\.kind !== "rows" \? \(/u.test(source) &&
      /visibleRows: visibleRows\.length/u.test(source),
    "the branch comes from one decision taken over what will render",
  );
  assert(
    /\{visibleRows\.map\(/u.test(source) &&
      !/\(searchActive \? renderedRows : \[\]\)\.map/u.test(source),
    "and the rows rendered are that same value",
  );
  assert(
    !/settling \|\| rows\.length === 0/u.test(source),
    "rows are not withheld for every settling stage, which blanked the screen for seconds",
  );

  /*
   * One panel, used everywhere an empty list can appear.
   *
   * The List's own panel applies whenever no row owns one, and it used to be
   * navigation plus the hidden-file toggle. Navigation renders nothing at the
   * top level, so that panel was just Toggle Hidden Files, which is what
   * Return did on the launch screen.
   */
  assert(
    (source.match(/<ActionPanel>/gu) ?? []).length === 1,
    "browser.tsx declares one action panel, so no site can drift from the chosen order",
  );
  assert(
    (source.match(/actions=\{emptyActions\}/gu) ?? []).length === 2,
    "the list and the one empty view use it",
  );
  assert(
    !/<ActionPanel>\s*<HiddenFilesAction/u.test(source),
    "no panel leads with the hidden-file toggle",
  );
  /*
   * A list with no rows always explains itself. The render used to fall
   * through to nothing while a query was in flight, leaving a blank screen.
   */
  assert(
    !/rows\.length === 0 && \(!searching/u.test(source),
    "no-rows does not depend on the search state, which used to fall through to nothing",
  );

  // Anchor on the two shared action declarations the panel reuses, not on the
  // first <List.EmptyView>. There are two empty views, and slicing from the
  // first one only found the right panel because that one happened to have
  // none of its own.
  const emptyPanelStart = locate(source, "  const rebuildAction = (");
  const emptyPanelEnd = locate(source, "</ActionPanel>", emptyPanelStart);
  assert(
    emptyPanelStart > 0 && emptyPanelEnd > emptyPanelStart,
    "the empty view's shared action panel is still where the test expects it",
  );
  const emptyPanelCode = transformSync(
    `${source.slice(
      emptyPanelStart,
      emptyPanelEnd + "</ActionPanel>".length,
    )});\nreturn emptyActions;`,
    { loader: "tsx", jsxFactory: "element" },
  ).code;
  for (const noIndex of [true, false]) {
    const emptyPanel = new Function(
      "element",
      "ActionPanel",
      "Action",
      "Icon",
      "Keyboard",
      "NavigationActions",
      "HiddenFilesAction",
      "SearchHistoryActions",
      "rowHandlers",
      "noIndex",
      emptyPanelCode,
    )(
      element,
      "panel",
      // An object, not a string: the panel reads Action.Style.Destructive.
      { Style: { Destructive: "destructive" } },
      {},
      { Shortcut: { Common: { Refresh: {} } } },
      loadActionComponent(
        "src/components/navigation-actions.tsx",
        "NavigationActions",
      ),
      loadActionComponent(
        "src/components/hidden-files-action.tsx",
        "HiddenFilesAction",
      ),
      () => null,
      {
        onUp: undefined,
        onReturnToStart: undefined,
        onToggleHidden: () => {},
        onRebuildIndex: () => {},
        onRefresh: () => {},
        onEraseEverything: () => {},
        onHistoryBack: () => {},
        onHistoryForward: () => {},
      },
      noIndex,
    );
    // Filter on the shape rather than the node type: these come from two
    // differently loaded Action bindings. Requiring onAction keeps section
    // headers, which also carry a title, out of the ordering check.
    const emptyActions = render(emptyPanel).filter(
      (node) =>
        typeof node.props?.title === "string" &&
        typeof node.props?.onAction === "function",
    );
    const titles = emptyActions.map((node) => node.props.title);
    assert(
      titles[0] !== "Toggle Hidden Files",
      `the empty view's first action is not the hidden-file toggle (noIndex=${noIndex}, first=${String(titles[0])})`,
    );
    assert(
      titles.includes("Rebuild Search Index") &&
        titles.includes("Toggle Hidden Files") &&
        titles.includes("Refresh"),
      "the empty view keeps rebuilding, refreshing and the hidden-file toggle available",
    );
    assert(
      new Set(titles).size === titles.length,
      `no action is offered twice (${titles.join(", ")})`,
    );
    if (!noIndex)
      assert(
        titles[0] === "Refresh",
        `with a working index, Return retries cheaply (first=${String(titles[0])})`,
      );
    if (noIndex)
      assert(
        titles[0] === "Rebuild Search Index",
        `with no index, Return rebuilds it, matching what the empty view says (first=${String(titles[0])})`,
      );
  }

  const inputCode = transformSync(
    between(source, "  const onSearchTextChange =", "  const rankingReady ="),
    { loader: "ts" },
  ).code;
  const inputController = new AbortController();
  let typed = "foo";
  const inputDependencies = {
    useCallback: (run: unknown) => run,
    query: "foo",
    queryController: inputController,
    setHistoryIndex: () => {},
    setQueryRevision: () => {},
    setSearchText: (next: string) => {
      typed = next;
    },
  };
  const changeQuery = new Function(
    ...Object.keys(inputDependencies),
    inputCode + "\nreturn onSearchTextChange;",
  )(...Object.values(inputDependencies));
  changeQuery("foo");
  assert(
    !inputController.signal.aborted,
    "an unchanged search text callback does not cancel ongoing work",
  );
  changeQuery("bar");
  assert(
    inputController.signal.aborted && typed === "bar",
    "editing the query cancels obsolete work before rendering the replacement",
  );
  const programmaticCode = transformSync(
    between(source, "  const setQueryProgrammatically =", "  const parent ="),
    { loader: "ts" },
  ).code;
  let historyIndex = 0;
  const historyDependencies = {
    ...inputDependencies,
    queryController: new AbortController(),
    setHistoryIndex: (index: number) => {
      historyIndex = index;
    },
  };
  const historyInput = new Function(
    ...Object.keys(historyDependencies),
    programmaticCode +
      inputCode +
      "\nreturn { recall: setQueryProgrammatically, edit: onSearchTextChange };",
  )(...Object.values(historyDependencies));
  historyInput.recall("recent");
  assert(historyIndex === 0, "recalling history retains its cursor");
  historyInput.edit("recentx");
  assert(
    historyIndex === -1,
    "the first edit after recalling history resets its cursor",
  );
  for (const direction of ["back", "forward"] as const) {
    const empty = stepSearchHistory([], -1, direction);
    assert(
      empty.kind === "refuse" &&
        empty.title === "No earlier searches yet" &&
        (direction === "back") === (empty.message !== undefined),
      `${direction} through an empty history refuses, and only Back explains how history is earned`,
    );
  }
  const oldest = stepSearchHistory(["a", "b"], 1, "back");
  assert(
    oldest.kind === "refuse" && oldest.title === "That is the oldest search",
    "Back off the end of history refuses rather than wrapping",
  );
  const newest = stepSearchHistory(["a", "b"], 0, "forward");
  assert(
    newest.kind === "clear",
    "Forward off the newest search returns to an empty query instead of refusing",
  );
  const older = stepSearchHistory(["a", "b"], 0, "back");
  assert(
    older.kind === "recall" && older.index === 1 && older.query === "b",
    "Back walks towards older searches",
  );
  const newer = stepSearchHistory(["a", "b"], 1, "forward");
  assert(
    newer.kind === "recall" && newer.index === 0 && newer.query === "a",
    "Forward walks back towards newer ones",
  );
  const historyBackCode = transformSync(
    `return ({${between(source, "      onHistoryBack:", "      onHistoryForward:")}}).onHistoryBack;`,
    { loader: "ts" },
  ).code;
  new Function(
    "stepSearchHistory",
    "history",
    "historyIndex",
    "setHistoryIndex",
    "setQueryProgrammatically",
    "showToast",
    "Toast",
    historyBackCode,
  )(
    stepSearchHistory,
    ["recent"],
    historyIndex,
    historyDependencies.setHistoryIndex,
    historyInput.recall,
    () => {},
    { Style: { Failure: "failure" } },
  )();
  assert(
    typed === "recent" && historyIndex === 0,
    "History Back after an edit recalls the newest search, even with only one entry",
  );

  let target: { dir?: string; initialSelectionPath?: string } = {};
  const upCode = transformSync(
    `return ({${between(source, "      onUp:", "      onHistoryBack:")}}).onUp;`,
    { loader: "ts" },
  ).code;
  const onUp = new Function("dir", "parent", "navigate", upCode)(
    "/foo/baz",
    "/foo",
    (dir: string, initialSelectionPath: string) => {
      target = { dir, initialSelectionPath };
    },
  );
  onUp();
  assert(
    target.dir === "/foo" && target.initialSelectionPath === "/foo/baz",
    "Command-Left opens the parent with the current folder selected",
  );
  /*
   * The indexed search effect, evaluated from the real source.
   *
   * The effect is deliberately synchronous inside a debounce timer, so these
   * checks are about one property: exactly one completed list reaches the view
   * per settled query, and no older query can ever overwrite a newer one.
   */
  const discoveryCode = transformSync(
    between(
      source,
      "  /**\n   * The indexed name search.",
      "  /** Pinned, frequently used",
    ),
    { loader: "ts" },
  ).code;
  const makeEntry = (full: string): Entry => ({
    path: full,
    name: path.basename(full),
    isDirectory: false,
    isSymlink: false,
    mtimeMs: 0,
    birthtimeMs: 0,
    size: 1,
  });

  type IndexCall = { query: string; showHidden: boolean; limit?: number };
  type Published = { found: Entry[]; publications: number };

  /** Drive the effect once with a controllable fake index. */
  function runIndexEffect(options: {
    parsed: queryTools.ParsedQuery;
    dir?: string;
    pathQuery?: unknown;
    showHidden?: boolean;
    searchActive?: boolean;
    controller?: AbortController;
    result?: (call: IndexCall) => {
      status: string;
      entries: Entry[];
      truncated?: boolean;
      tooShort?: boolean;
      error?: string;
    };
  }) {
    const calls: IndexCall[] = [];
    const delays: number[] = [];
    const published: Published = { found: [], publications: 0 };
    const state = {
      searching: [] as boolean[],
      truncated: [] as boolean[],
      tooShort: [] as boolean[],
      status: [] as string[],
      error: [] as (string | undefined)[],
    };
    let stop: (() => void) | undefined;
    const dependencies = {
      ...searchLimits,
      ...queryTools,
      useEffect: (run: () => (() => void) | undefined) => {
        stop = run();
      },
      setTimeout: (run: () => void, delay: number) => {
        delays.push(delay);
        return setTimeout(run, 0);
      },
      clearTimeout,
      indexFile: "/support/file-index.sqlite",
      dir: options.dir,
      pathQuery: options.pathQuery,
      parsed: options.parsed,
      showHidden: options.showHidden ?? false,
      reloadKey: 0,
      queryKey: JSON.stringify(options.parsed.tokens),
      searchActive: options.searchActive ?? true,
      queryController: options.controller ?? new AbortController(),
      setFound: (value: Entry[]) => {
        published.found = value;
        if (value.length > 0) published.publications += 1;
      },
      setSearching: (value: boolean) => state.searching.push(value),
      setResultsTruncated: (value: boolean) => state.truncated.push(value),
      setIndexTooShort: (value: boolean) => state.tooShort.push(value),
      setIndexStatus: (value: string) => state.status.push(value),
      setSearchError: (value?: string) => state.error.push(value),
      setSearchPartial: () => {},
      searchIndex: (
        _file: string,
        parsed: queryTools.ParsedQuery,
        opts: { showHidden?: boolean; limit?: number },
      ) => {
        const call = {
          query: parsed.tokens.join(" "),
          showHidden: opts.showHidden ?? false,
          limit: opts.limit,
        };
        calls.push(call);
        return (
          options.result?.(call) ?? {
            status: "ready",
            entries: [makeEntry("/idx/one.txt")],
            truncated: false,
            tooShort: false,
          }
        );
      },
    };
    const debounceCode = through(source, "const INDEX_DEBOUNCE_MS =", ";");
    new Function(...Object.keys(dependencies), debounceCode + discoveryCode)(
      ...Object.values(dependencies),
    );
    return { calls, delays, published, state, stop: () => stop?.() };
  }

  const settleTimers = () =>
    new Promise<void>((resolve) => setTimeout(resolve, 20));

  // One settled query publishes exactly one complete list.
  const single = runIndexEffect({ parsed: queryTools.parseQuery("annual") });
  await settleTimers();
  assert(
    single.delays.length === 1 && single.delays[0] <= 20,
    "indexed search reserves at most 20ms of the input-to-display budget for debounce",
  );
  assert(
    single.calls.length === 1 && single.calls[0].limit === 50,
    "a settled query asks the index once for at most 50 candidates",
  );
  assert(
    single.published.publications === 1 && single.published.found.length === 1,
    "the completed list is published once, not accumulated in batches",
  );
  assert(
    single.calls[0].limit === searchLimits.LIVE_RESULTS,
    "the candidate limit passed to the index is the ranked-result cap",
  );
  assert(
    single.state.searching[0] === true &&
      single.state.searching.at(-1) === false,
    "the search is reported running and then finished",
  );
  single.stop();

  // Rapid typing: only the final query reaches the index.
  const burst: ReturnType<typeof runIndexEffect>[] = [];
  for (const text of ["ann", "annu", "annua", "annual"]) {
    const run = runIndexEffect({ parsed: queryTools.parseQuery(text) });
    burst.push(run);
    // Each keystroke replaces the effect before its timer fires.
    if (text !== "annual") run.stop();
  }
  await settleTimers();
  assert(
    burst.slice(0, -1).every((run) => run.calls.length === 0),
    "a superseded keystroke never reaches the index",
  );
  assert(
    burst.at(-1)!.calls.length === 1 &&
      burst.at(-1)!.calls[0].query === "annual",
    "only the final query in a burst is executed",
  );
  burst.at(-1)!.stop();

  // A cancelled query publishes nothing, even if its timer has been scheduled.
  const cancelController = new AbortController();
  const cancelled = runIndexEffect({
    parsed: queryTools.parseQuery("annual"),
    controller: cancelController,
  });
  cancelController.abort();
  await settleTimers();
  assert(
    cancelled.calls.length === 0 && cancelled.published.publications === 0,
    "a query cancelled before its timer fires neither runs nor publishes",
  );
  cancelled.stop();

  /*
   * Staleness by construction: the effect's cleanup runs before the next
   * effect's body, and the query is synchronous, so there is no point at which
   * an older query holds a result it could still publish.
   */
  const stale = runIndexEffect({ parsed: queryTools.parseQuery("older") });
  stale.stop();
  const fresh = runIndexEffect({ parsed: queryTools.parseQuery("newer") });
  await settleTimers();
  assert(
    stale.published.publications === 0,
    "a stopped older query cannot publish after a newer one starts",
  );
  assert(
    fresh.published.found.length === 1 && fresh.calls[0].query === "newer",
    "the newer query's list is the one that reaches the view",
  );
  fresh.stop();

  // Truncation at the candidate cap is reported rather than hidden.
  const capped = runIndexEffect({
    parsed: queryTools.parseQuery("bulk"),
    result: () => ({
      status: "ready",
      entries: Array.from({ length: searchLimits.LIVE_RESULTS }, (_, i) =>
        makeEntry(`/idx/bulk-${i}.txt`),
      ),
      truncated: true,
    }),
  });
  await settleTimers();
  assert(
    capped.published.found.length === searchLimits.LIVE_RESULTS &&
      capped.state.truncated.includes(true),
    "a result set at the candidate cap is published and reported as truncated",
  );
  capped.stop();

  // A failed index is reported as an error, not as an empty result set.
  const failed = runIndexEffect({
    parsed: queryTools.parseQuery("annual"),
    result: () => ({
      status: "failed",
      entries: [],
      error: "database disk image is malformed",
    }),
  });
  await settleTimers();
  assert(
    failed.state.status.includes("failed") &&
      failed.state.error.some((message) => message !== undefined),
    "an unreadable index is reported rather than looking like no matches",
  );
  failed.stop();

  // A too-short query is reported, and the index is still asked so the policy
  // lives in one place rather than being duplicated by the caller.
  const tooShort = runIndexEffect({
    parsed: queryTools.parseQuery("ab"),
    result: () => ({ status: "ready", entries: [], tooShort: true }),
  });
  await settleTimers();
  assert(
    tooShort.state.tooShort.includes(true) &&
      tooShort.published.found.length === 0,
    "a two-character query publishes no indexed rows and reports why",
  );
  tooShort.stop();

  // Scopes that must never query the index.
  for (const [label, options] of [
    ["a folder shows direct children only", { dir: "/foo" }],
    [
      "the path bar reads the typed location",
      { pathQuery: { dir: "/foo", prefix: "" } },
    ],
    [
      "an empty query has nothing to look up",
      { parsed: queryTools.parseQuery("") },
    ],
    [
      "a bare dot is answered by reading, not the index",
      { parsed: queryTools.parseQuery(".") },
    ],
    ["an inactive view does no work", { searchActive: false }],
  ] as [string, Parameters<typeof runIndexEffect>[0]][]) {
    const run = runIndexEffect({
      parsed: queryTools.parseQuery("annual"),
      ...options,
    });
    await settleTimers();
    assert(run.calls.length === 0, `the index is not queried when ${label}`);
    run.stop();
  }

  // Hidden visibility is passed through rather than filtered afterwards.
  const hidden = runIndexEffect({
    parsed: queryTools.parseQuery("annual"),
    showHidden: true,
  });
  await settleTimers();
  assert(
    hidden.calls[0]?.showHidden === true,
    "hidden visibility is pushed into the index query",
  );
  hidden.stop();

  /*
   * The same effect under real React, replayed as Strict Mode does at startup,
   * with the query cancelled and restarted by history navigation.
   */
  const lifecycleCode = transformSync(
    between(source, "  const scopeController =", "  const navigate ="),
    { loader: "ts" },
  ).code;
  const indexQueries: string[] = [];
  const lifecycleDependencies = {
    ...searchLimits,
    ...queryTools,
    useEffect: React.useEffect,
    useMemo: React.useMemo,
    useState: React.useState,
    useCallback: React.useCallback,
    createElement: React.createElement,
    setHistoryIndex: () => {},
    path,
    // Defined outside the sliced regions, so supplied here.
    dir: undefined,
    pathQuery: undefined,
    searchActive: true,
    INDEX_DEBOUNCE_MS: 0,
    indexFile: "/support/file-index.sqlite",
    setIndexStatus: () => {},
    setIndexTooShort: () => {},
    setResultsTruncated: () => {},
    setSearchError: () => {},
    setSearchPartial: () => {},
    searchIndex: (_file: string, parsed: queryTools.ParsedQuery) => {
      const query = parsed.tokens.join(" ");
      indexQueries.push(query);
      return {
        status: "ready",
        entries: query === "foo_bar" ? [makeEntry("/foo/foo_bar")] : [],
        truncated: false,
        tooShort: false,
      };
    },
  };
  const historyInputCode = transformSync(
    between(
      source,
      "  const setQueryProgrammatically =",
      "  const parent = dir",
    ),
    { loader: "ts" },
  ).code;
  const Lifecycle = new Function(
    ...Object.keys(lifecycleDependencies),
    `return function Lifecycle({initialQuery = ""}) {
      const [searchText, setSearchText] = useState(initialQuery);
      const [reloadKey, setReloadKey] = useState(0);
      const [found, setFound] = useState([]);
      const [searching, setSearching] = useState(false);
      const [includeHidden, setIncludeHidden] = useState(false);
      const query = searchText.trim();
      const parsed = useMemo(() => parseQuery(searchText), [searchText]);
      const queryKey = useMemo(() => JSON.stringify(parsed.tokens), [parsed]);
      ${visibilityCode}
      ${lifecycleCode}
      ${inputCode}
      ${historyInputCode}
      ${discoveryCode}
      return createElement("search", {
        change: onSearchTextChange,
        historyChange: setQueryProgrammatically,
        refresh: () => setReloadKey(key => key + 1),
        setHidden: setIncludeHidden,
        cancelScope: () => scopeController.abort(),
        found, searching, signal: queryController.signal
      });
    };`,
  )(...Object.values(lifecycleDependencies));
  const testGlobals = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const previousAct = testGlobals.IS_REACT_ACT_ENVIRONMENT;
  testGlobals.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer;
  const settle = () => act(() => new Promise((r) => setTimeout(r, 50)));
  const mount = (initialQuery = "") =>
    act(() => {
      renderer = create(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(Lifecycle, { initialQuery }),
        ),
      );
    });
  const currentSearch = () => renderer.root.findByType("search");
  try {
    await mount();
    await settle();
    assert(
      !currentSearch().props.signal.aborted,
      "Strict Mode startup leaves a usable query signal before the first keystroke",
    );
    await act(() => {
      for (const query of ["f", "fo", "foo", "foo_bar"])
        currentSearch().props.change(query);
    });
    await settle();
    assert(
      currentSearch().props.found.some(
        (entry: Entry) => entry.path === "/foo/foo_bar",
      ),
      "typing on first launch reaches the index without a setup run",
    );
    assert(
      indexQueries.at(-1) === "foo_bar",
      "the last query typed is the one the index answers",
    );
    await act(() => currentSearch().props.refresh());
    await settle();
    assert(
      currentSearch().props.found.length === 1,
      "a refresh keeps the current query searchable",
    );
    await act(() => {
      currentSearch().props.change("foo_ba");
      currentSearch().props.change("foo_bar");
    });
    await settle();
    assert(
      !currentSearch().props.signal.aborted && !currentSearch().props.searching,
      "a batched edit back to the same query cannot leave search permanently cancelled",
    );
    await act(() => {
      currentSearch().props.historyChange("foo_ba");
      currentSearch().props.historyChange("foo_bar");
    });
    await settle();
    assert(
      !currentSearch().props.signal.aborted &&
        currentSearch().props.found.length === 1,
      "batched history navigation back to the same query restarts cancelled work",
    );
    await act(() => currentSearch().props.change("foo_baz"));
    await settle();
    await act(() => currentSearch().props.change("foo_bar"));
    await settle();
    assert(
      currentSearch().props.found.length === 1 &&
        !currentSearch().props.searching,
      "fast edits and a repeated query still run the final search",
    );
    await act(() => renderer.unmount());
    await mount("foo_bar");
    await settle();
    assert(
      currentSearch().props.found.length === 1,
      "a new route searches its initial query after effect replay without another keystroke",
    );
    const beforeToggle = currentSearch().props.signal;
    await act(() => currentSearch().props.setHidden(true));
    await settle();
    assert(
      beforeToggle.aborted,
      "changing hidden visibility aborts the replaced query signal, so cached reads holding it stop",
    );
    assert(
      !currentSearch().props.signal.aborted &&
        currentSearch().props.found.length === 1,
      "changing hidden visibility reruns the current query",
    );
    const unchangedVisibility = currentSearch().props.signal;
    await act(() => currentSearch().props.setHidden(true));
    assert(
      currentSearch().props.signal === unchangedVisibility &&
        !unchangedVisibility.aborted,
      "unchanged effective visibility does not cancel the live search",
    );

    // Memory stability across many searches and a lot of published rows.
    const before = process.memoryUsage().heapUsed;
    for (let i = 0; i < 200; i++) {
      await act(() => currentSearch().props.change(`query_${i}`));
    }
    await settle();
    global.gc?.();
    const growth = process.memoryUsage().heapUsed - before;
    assert(
      growth < 64 * 1024 * 1024,
      `two hundred searches do not retain unbounded state (${Math.round(growth / 1048576)}MB)`,
    );
    const queriesBeforeCancellation = indexQueries.length;
    await act(() => {
      currentSearch().props.cancelScope();
      currentSearch().props.change("foo_bar");
    });
    await settle();
    assert(
      currentSearch().props.signal.aborted &&
        indexQueries.length === queriesBeforeCancellation,
      "controller recovery never restarts work after its scope was intentionally cancelled",
    );
  } finally {
    await act(() => renderer?.unmount());
    testGlobals.IS_REACT_ACT_ENVIRONMENT = previousAct;
  }
  const rankCode = transformSync(
    between(
      source,
      "  const rankSources = useCallback(",
      "  /** Delayed search results",
    ),
    { loader: "ts" },
  ).code;
  const rankDependencies = {
    ...queryTools,
    path,
    rankCandidates: rankSources,
    useCallback: (run: unknown) => run,
    dir: "/foo",
    canonicalDir: "/private/foo",
    learnedSet: new Set(["/elsewhere/bar"]),
    pathQuery: undefined,
    effectiveQuery: "-d",
    parsed: queryTools.parseQuery("-d"),
    visits: {},
    tick: 0,
    sortMode: "usage",
    showHidden: false,
  };
  const rank = new Function(
    ...Object.keys(rankDependencies),
    rankCode + "\nreturn rankSources;",
  )(...Object.values(rankDependencies)) as (
    entries: Entry[],
  ) => { entry: Entry }[];
  const entries = [
    "/foo/bar",
    "/foo/bar/baz",
    "/foobar/baz",
    "/elsewhere/bar",
    "/foo",
  ].map((full) => ({
    path: full,
    name: path.basename(full),
    isDirectory: true,
    isSymlink: false,
    size: 0,
    mtimeMs: 0,
    birthtimeMs: 0,
  }));
  const scoped = rank(entries);
  assert(
    scoped.length === 1 &&
      scoped.every((row) => row.entry.path.startsWith("/foo/")),
    "folder-scoped ranking excludes unrelated cached and learned paths, prefix siblings, and the scope itself",
  );
  const canonicalChild = {
    ...entries[0],
    path: "/private/foo/bar/baz",
    storagePath: "/private/foo/bar/baz",
  };
  assert(
    rank([canonicalChild]).length === 0,
    "typed folder queries exclude canonical grandchildren from cached and delayed results",
  );
  const browsingDependencies = {
    ...rankDependencies,
    effectiveQuery: "",
    parsed: queryTools.parseQuery(""),
  };
  const browse = new Function(
    ...Object.keys(browsingDependencies),
    rankCode + "\nreturn rankSources;",
  )(...Object.values(browsingDependencies)) as typeof rank;
  const browsed = browse([...entries, canonicalChild]);
  const hiddenEntry = { ...entries[0], path: "/foo/.bar", name: ".bar" };
  assert(
    browse([entries[0], hiddenEntry]).length === 1,
    "hiding files removes cached hidden rows as well as fresh directory entries",
  );
  const visibleDependencies = { ...browsingDependencies, showHidden: true };
  const browseHidden = new Function(
    ...Object.keys(visibleDependencies),
    rankCode + "\nreturn rankSources;",
  )(...Object.values(visibleDependencies)) as typeof rank;
  assert(
    browseHidden([entries[0], hiddenEntry]).length === 2,
    "showing hidden files keeps both hidden and ordinary cached rows",
  );
  // A memory match must survive a flood of indexed rows. `collectedRows` ranks
  // the two sources together and caps afterwards, so a highly ranked visited
  // file cannot be pushed past 500 by index results that rank below it.
  const mergeDependencies = {
    ...rankDependencies,
    dir: undefined,
    canonicalDir: undefined,
    learnedSet: new Set<string>(),
    effectiveQuery: "bar",
    parsed: queryTools.parseQuery("bar"),
    // A real usage record and the real Usage comparator: a stub compare would
    // make the sort a no-op and the ordering claim below meaningless.
    visits: {
      "/memory/bar.txt": { count: 40, lastVisit: Date.now(), ems: 40, tick: 8 },
    },
    tick: 8,
  };
  const rankMerged = new Function(
    ...Object.keys(mergeDependencies),
    rankCode + "\nreturn rankSources;",
  )(...Object.values(mergeDependencies)) as typeof rank;
  const remembered: Entry = {
    path: "/memory/bar.txt",
    name: "bar.txt",
    isDirectory: false,
    isSymlink: false,
    size: 1,
    mtimeMs: 0,
    birthtimeMs: 0,
  };
  const flood: Entry[] = Array.from({ length: 900 }, (_, i) => ({
    path: `/indexed/bar-${i}.txt`,
    name: `bar-${i}.txt`,
    isDirectory: false,
    isSymlink: false,
    size: 1,
    mtimeMs: 0,
    birthtimeMs: 0,
  }));
  const mergedRows = rankMerged([...flood, remembered]);
  const cappedRows = mergedRows.slice(0, searchLimits.LIVE_RESULTS);
  assert(
    mergedRows.length === 901,
    "memory and indexed results are ranked as one list before any cap",
  );
  assert(
    cappedRows.some((row) => row.entry.path === remembered.path),
    "a visited file survives the 500-row cap alongside 900 indexed rows",
  );
  assert(
    mergedRows[0]?.entry.path === remembered.path,
    "and its usage puts it first, rather than merely inside the cap",
  );
  assert(
    mergedRows.length > searchLimits.LIVE_RESULTS,
    "the cap is applied to the merged list, so truncation is reported from it",
  );

  const typedHiddenDependencies = {
    ...rankDependencies,
    dir: undefined,
    pathQuery: { dir: "/foo", prefix: ".bar" },
    effectiveQuery: ".bar",
    parsed: queryTools.parseQuery("/foo/.bar"),
  };
  const rankTypedHidden = new Function(
    ...Object.keys(typedHiddenDependencies),
    rankCode + "\nreturn rankSources;",
  )(...Object.values(typedHiddenDependencies)) as typeof rank;
  assert(
    rankTypedHidden([hiddenEntry])[0]?.entry.path === "/foo/.bar",
    "an explicitly typed hidden path stays accessible with the toggle off",
  );
  for (const type of ["all", "directory", "file"] as const) {
    for (const pathBar of [false, true]) {
      const dependencies = {
        ...rankDependencies,
        parsed: queryTools.parseQuery("", type),
        effectiveQuery: "",
        pathQuery: pathBar ? { dir: "/foo", prefix: "" } : undefined,
        learnedSet: new Set(["/foo/bar", "/foo/baz.txt"]),
      };
      const filteredRank = new Function(
        ...Object.keys(dependencies),
        rankCode + "\nreturn rankSources;",
      )(...Object.values(dependencies)) as typeof rank;
      const result = filteredRank([
        entries[0],
        {
          ...entries[0],
          path: "/foo/baz.txt",
          name: "baz.txt",
          isDirectory: false,
        },
        canonicalChild,
      ]);
      assert(
        result.length === (type === "all" ? 2 : 1) &&
          result.every(
            ({ entry }) =>
              type === "all" || entry.isDirectory === (type === "directory"),
          ),
        `${type} menu filter applies to ${pathBar ? "path-bar" : "folder"} ranking, including learned matches`,
      );
    }
  }
  assert(
    browsed.length === 1 && browsed[0].entry.path === "/foo/bar",
    "clearing a folder query excludes cached and delayed descendants from the listing",
  );
  const canonicalImmediateChild = {
    ...canonicalChild,
    path: "/private/foo/baz",
    storagePath: "/private/foo/baz",
  };
  const shortcutChild = {
    ...entries[0],
    path: "/foo/qux",
    storagePath: "/elsewhere/qux",
    isSymlink: true,
  };
  assert(
    browse([canonicalImmediateChild, shortcutChild]).length === 2,
    "empty folder browsing retains canonical immediate children and direct shortcuts to outside targets",
  );
  assert(
    rank([canonicalImmediateChild, shortcutChild]).length === 2,
    "typed folder queries retain canonical direct children and direct shortcuts to outside targets",
  );
  const cloudEntries = [
    "/foo/Library/CloudStorage",
    "/foo/Library/CloudStorage/bar.pdf",
    "/foo/Library/CloudStorage/baz",
  ].map((full) => ({
    ...makeEntry(full),
    isDirectory: !full.endsWith(".pdf"),
  }));
  const cloudDependencies = {
    ...rankDependencies,
    dir: "/foo/Library",
    canonicalDir: "/foo/Library",
    effectiveQuery: "cloud",
    parsed: queryTools.parseQuery("cloud"),
    learnedSet: new Set([cloudEntries[1].path]),
  };
  const rankCloud = new Function(
    ...Object.keys(cloudDependencies),
    rankCode + "\nreturn rankSources;",
  )(...Object.values(cloudDependencies)) as typeof rank;
  const cloudResults = rankCloud(cloudEntries);
  assert(
    cloudResults.length === 1 &&
      cloudResults[0].entry.path === cloudEntries[0].path,
    "cloud inside Library finds CloudStorage but never its contents, even learned matches",
  );
  for (const [variable, end, values] of [
    [
      "learnedCandidates",
      "learnedCache",
      {
        learnedPaths: [
          "/foo/bar",
          "/foo/bar/baz",
          "/private/foo/bar",
          "/private/foo/bar/baz",
          "/foobar/bar",
        ],
      },
    ],
  ] as const) {
    const code = transformSync(
      between(source, `  const ${variable} =`, `  const ${end} =`),
      { loader: "ts" },
    ).code;
    const deps = {
      ...queryTools,
      path,
      dir: "/foo",
      canonicalDir: "/private/foo",
      query: "bar",
      parsed: queryTools.parseQuery("bar"),
      useMemo: (run: () => unknown) => run(),
      ...values,
    };
    const candidates = new Function(
      ...Object.keys(deps),
      code + `\nreturn ${variable};`,
    )(...Object.values(deps)) as { path: string }[];
    assert(
      candidates.length === 2 &&
        candidates.every(
          ({ path: full }) =>
            full === "/foo/bar" || full === "/private/foo/bar",
        ),
      `${variable} excludes grandchildren before filesystem validation`,
    );
  }
  // Inside a folder the list is its direct children, whatever is typed.
  for (const query of ["cloud", "foo -d", "foo ext:pdf", ".foo bar"]) {
    const scoped = runIndexEffect({
      parsed: queryTools.parseQuery(query),
      dir: "/foo",
    });
    await settleTimers();
    assert(
      scoped.calls.length === 0,
      `folder query ${JSON.stringify(query)} searches direct children without querying the index`,
    );
    scoped.stop();
  }
  const mergeCode = transformSync(
    between(source, "  /** Delayed search results", "  const markVisited"),
    { loader: "ts" },
  ).code;
  const boundedDependencies = {
    useRef: () => ({ current: undefined }),
    queryKey: "",
    useMemo: (run: () => unknown) => run(),
    pathQuery: undefined,
    found: flood,
    instantRows: rankMerged([remembered]),
    children: [],
    startingPoints: [remembered],
    sharedFolders: [],
    learnedMatches: [],
    hiddenHome: [],
    pathRows: [],
    query: "",
    rankSources: rankMerged,
    displayRows,
    LIVE_RESULTS: searchLimits.LIVE_RESULTS,
    initialSelectionPath: flood[899].path,
  };
  const bounded = new Function(
    ...Object.keys(boundedDependencies),
    mergeCode + "\nreturn { rows, rowLimitReached };",
  )(...Object.values(boundedDependencies));
  assert(
    bounded.rows.length === 50 && bounded.rowLimitReached,
    "merged memory and indexed results retain only 50 ranked rows and report omissions",
  );
  assert(
    bounded.rows[0].entry.path === remembered.path,
    "the 50-result budget preserves the highest usage memory match",
  );
  assert(
    bounded.rows[49].entry.path === flood[899].path,
    "the folder just left stays selectable even outside the first 50 results",
  );
  const selectedDependencies = {
    ...boundedDependencies,
    initialSelectionPath: undefined,
    queryKey: "bar",
    useRef: () => ({
      current: { query: "", queryKey: "bar", read: () => flood[898].path },
    }),
  };
  const selectedRows = new Function(
    ...Object.keys(selectedDependencies),
    mergeCode + "\nreturn rows;",
  )(...Object.values(selectedDependencies));
  assert(
    selectedRows.length === 50 &&
      selectedRows[49].entry.path === flood[898].path,
    "sorting keeps the live selection even when it ranks below the candidate budget",
  );
  const metadataEntry = { ...entries[0], useCount: 42, lastUsedMs: Date.now() };
  const metadataDependencies = {
    ...boundedDependencies,
    found: [metadataEntry],
    startingPoints: [entries[0]],
    rankSources: rank,
    initialSelectionPath: undefined,
  };
  const merged = new Function(
    ...Object.keys(metadataDependencies),
    mergeCode + "\nreturn rows;",
  )(...Object.values(metadataDependencies)) as { entry: Entry }[];
  assert(
    merged.length === 1 &&
      merged[0].entry.useCount === 42 &&
      merged[0].entry.lastUsedMs === metadataEntry.lastUsedMs,
    "usage enrichment survives when the same result becomes available from the cache",
  );
  assert(
    !source.includes("standardPlaces()"),
    "starting-place discovery does not run synchronous filesystem calls during render",
  );
  const visitsStart = locate(
    source,
    "  useEffect(() => {",
    locate(source, "// Load only visits"),
  );
  const visitsEffect = through(
    source,
    "  useEffect(() => {",
    "  }, [reloadKey]);",
    visitsStart,
  );
  const effect = transformSync(visitsEffect, { loader: "ts" }).code;
  let generation = "before";
  let cleanup: (() => void) | undefined;
  let release: (value: object) => void = () => {};
  let visits: object = {};
  const late = new Promise<object>((resolve) => {
    release = resolve;
  });
  const dependencies = {
    useEffect: (run: () => (() => void) | undefined) => {
      cleanup = run();
    },
    reloadKey: 0,
    dataGeneration: () => generation,
    loadVisitLog: () => late,
    loadPins: async () => [],
    setVisitLog: (value: object) => {
      visits = value;
    },
    setPins: () => {},
    setIsLoading: () => {},
  };
  new Function(...Object.keys(dependencies), effect)(
    ...Object.values(dependencies),
  );
  cleanup?.();
  generation = "after";
  release({ old: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert(
    Object.keys(visits).length === 0,
    "an old browser storage load cannot restore pre-reset visits",
  );
  const background = transformSync(
    through(
      source,
      "  useEffect(() => {",
      "  }, [reloadKey, indexFile]);",
      visitsStart + visitsEffect.length,
    ),
    { loader: "ts" },
  ).code;
  for (const stalled of ["loadSearches", "loadAbbreviations"]) {
    let reset = false;
    let latePublications = 0;
    let finish = () => {};
    const waiting = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const values = { loadSearches: [], loadAbbreviations: {} };
    const backgroundDependencies: Record<string, unknown> = {
      useEffect: (run: () => unknown) => run(),
      reloadKey: 0,
      indexFile: "/tmp/index.sqlite",
      dataGeneration: () => (reset ? "after" : "before"),
      readIndexCoverage: () => ({ status: "ok" }),
    };
    for (const [name, value] of Object.entries(values))
      backgroundDependencies[name] = async () => {
        if (name === stalled) await waiting;
        return value;
      };
    for (const name of [
      "setBackgroundPending",
      "setHistory",
      "setAbbreviations",
      "setCoverage",
      "setIndexStatus",
    ])
      backgroundDependencies[name] = () => {
        if (reset) latePublications++;
      };
    new Function(...Object.keys(backgroundDependencies), background)(
      ...Object.values(backgroundDependencies),
    );
    await new Promise((resolve) => setImmediate(resolve));
    reset = true;
    finish();
    await new Promise((resolve) => setImmediate(resolve));
    assert(
      latePublications === 0,
      `a reset during ${stalled} prevents all subsequent browser publications`,
    );
  }
  // Every in-memory candidate source, from the first to the last.
  const cached = between(
    source,
    "  const startingCandidates = useMemo",
    "  /** Hidden Home entries",
  );
  const learnedCode = transformSync(
    between(source, "  const learnedCache =", "  const learnedMatches ="),
    { loader: "ts" },
  ).code;
  const startingCode = transformSync(
    between(source, "  const startingCache =", "  const startingPoints ="),
    { loader: "ts" },
  ).code;
  const memoryDeps = {
    useCachedEntries: (candidates: { path: string }[], query: string) =>
      createRecentValidator(async (full) => makeEntry(full))(candidates, {
        query,
        limit: 50,
      }),
    startingCandidates: [
      ...Array.from({ length: 70 }, (_, i) => ({
        path: `/pins/unrelated${i}`,
      })),
      { path: "/visited/zz-target" },
    ],
    query: "zz",
    reloadKey: 0,
    queryController: new AbortController(),
    parsed: queryTools.parseQuery("zz"),
  };
  const memory = await new Function(
    ...Object.keys(memoryDeps),
    startingCode + "\nreturn startingCache;",
  )(...Object.values(memoryDeps));
  assert(
    memory.entries.some((e: Entry) => e.path === "/visited/zz-target"),
    "short queries find remembered matches beyond 50 nonmatching pins",
  );
  const learned = await new Function(
    "useCachedEntries",
    "learnedCandidates",
    "query",
    "reloadKey",
    "queryController",
    "parsed",
    learnedCode + "\nreturn learnedCache;",
  )(
    (candidates: { path: string }[], query: string) =>
      createRecentValidator(async (full) => makeEntry(full))(candidates, {
        query,
      }),
    [{ path: "/foo/unrelated.txt" }],
    "baz",
    0,
    new AbortController(),
    queryTools.parseQuery("baz"),
  );
  assert(
    learned.entries.length === 1,
    "learned abbreviations retain paths that do not textually match the query",
  );
  assert(
    !/statEntry\(/.test(cached),
    "cached search candidates do not perform synchronous metadata reads during render",
  );
}
