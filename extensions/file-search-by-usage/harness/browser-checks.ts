import fs from "node:fs";
import { transformSync } from "esbuild";
import path from "node:path";
import * as queryTools from "../src/lib/query";
import { scoreEntry } from "../src/lib/score";
import { entryStoragePath } from "../src/lib/entry-identity";
import { relativeDepth } from "../src/lib/read-dir";
import { Entry } from "../src/lib/types";
import { createRecentValidator } from "../src/lib/recent-validation";
import { createWorkQueue } from "../src/lib/work-queue";
import { runSpotlightSearch } from "../src/lib/spotlight";
import * as searchLimits from "../src/lib/search-limits";
import { sortChecks } from "./sort-checks";
import { folderSelectionChecks } from "./folder-selection-checks";
import { navigationMemoryChecks } from "./navigation-memory-checks";
import { navigationStackChecks } from "./navigation-stack-checks";
import { listRenderChecks } from "./list-render-checks";
import * as React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";

/** Exercise the browser's real storage effect with controlled late responses. */
export async function browserChecks(
  assert: (ok: boolean, label: string) => void,
) {
  await sortChecks(assert);
  await folderSelectionChecks(assert);
  await listRenderChecks(assert);
  await navigationMemoryChecks(assert);
  await navigationStackChecks(assert);
  const source = fs.readFileSync("src/components/browser.tsx", "utf8");
  const setupActionsFile = "src/components/setup-actions.tsx";
  if (!fs.existsSync(setupActionsFile)) {
    assert(
      false,
      "setup remains available in Actions after the main prompt is dismissed",
    );
  } else {
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
    const renderedModule = {
      exports: {} as { SetupActions: (props: object) => ActionNode },
    };
    const actionCode = transformSync(
      fs.readFileSync(setupActionsFile, "utf8"),
      {
        loader: "tsx",
        format: "cjs",
        jsxFactory: "element",
        jsxFragment: "fragment",
      },
    ).code;
    new Function(
      "require",
      "module",
      "exports",
      "element",
      "fragment",
      actionCode,
    )(
      () => ({
        Action: "action",
        ActionPanel: { Section: "section" },
        Icon: { Clock: "clock" },
      }),
      renderedModule,
      renderedModule.exports,
      element,
      "fragment",
    );
    const flatten = (node: ActionNode): ActionNode[] =>
      !node || typeof node !== "object"
        ? []
        : [node, ...node.children.flatMap(flatten)];
    let starts = 0;
    let stops = 0;
    const props = {
      setup: { recents: false, drive: false, hasRun: true },
      importing: false,
      start: () => {
        starts++;
      },
      cancel: () => {
        stops++;
      },
      skip: () => {},
    };
    const actions = flatten(renderedModule.exports.SetupActions(props));
    const start = actions.find((node) => node.props.title === "Set Up Search");
    (start?.props.onAction as (() => void) | undefined)?.();
    assert(
      starts === 1,
      "Actions can start setup again even when no unfinished steps remain",
    );
    const runningActions = flatten(
      renderedModule.exports.SetupActions({ ...props, importing: true }),
    );
    const stop = runningActions.find(
      (node) => node.props.title === "Stop Setup",
    );
    (stop?.props.onAction as (() => void) | undefined)?.();
    assert(
      stops === 1 &&
        !runningActions.some((node) => node.props.title === "Set Up Search"),
      "running setup exposes Stop Setup instead of a duplicate start action",
    );
    const partialActions = flatten(
      renderedModule.exports.SetupActions({
        ...props,
        setup: { recents: true, drive: true, hasRun: true },
      }),
    );
    assert(
      partialActions.some((node) => node.props.title === "Skip Google Drive") &&
        partialActions.some((node) => node.props.title === "Skip Recent Files"),
      "unfinished sources can still be skipped from Actions after the main prompt disappears",
    );
  }
  const inputCode = transformSync(
    source.slice(
      source.indexOf("  const onSearchTextChange ="),
      source.indexOf("  const rankingReady ="),
    ),
    { loader: "ts" },
  ).code;
  const inputController = new AbortController();
  let typed = "foo";
  const inputDependencies = {
    useCallback: (run: unknown) => run,
    query: "foo",
    queryController: inputController,
    programmaticEdit: { current: false },
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
  let target: { dir?: string; initialSelectionPath?: string } = {};
  const upStart = source.indexOf("      onUp:");
  const upEnd = source.indexOf("      onHistoryBack:", upStart);
  const upCode = transformSync(
    `return ({${source.slice(upStart, upEnd)}}).onUp;`,
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
  const discoveryStart = source.indexOf("  // Rank paths first");
  const discoveryEnd = source.indexOf(
    "  /** Pinned, frequently used",
    discoveryStart,
  );
  const discoveryCode = transformSync(
    source.slice(discoveryStart, discoveryEnd),
    { loader: "ts" },
  ).code;
  const paths = Array.from({ length: 125 }, (_, i) => `/foo/bar${i}.txt`);
  const makeEntry = (full: string): Entry => ({
    path: full,
    name: path.basename(full),
    isDirectory: false,
    isSymlink: false,
    mtimeMs: 0,
    birthtimeMs: 0,
    size: 1,
  });
  let liveFound: Entry[] = [];
  let stopDiscovery: (() => void) | undefined;
  const queryController = new AbortController();
  const discoveryDependencies = {
    ...searchLimits,
    createWorkQueue,
    setMaxListeners: () => {},
    ...queryTools,
    path,
    os: { homedir: () => "/foo" },
    useEffect: (run: () => (() => void) | undefined) => {
      stopDiscovery = run();
    },
    setTimeout: (run: () => void) => setTimeout(run, 0),
    clearTimeout,
    setFound: (value: Entry[] | ((previous: Entry[]) => Entry[])) => {
      liveFound = typeof value === "function" ? value(liveFound) : value;
    },
    setFoundUsagePending: () => {},
    setFoundUsageError: () => {},
    setFoundUsagePartial: () => {},
    setSearchError: () => {},
    setSearchPartial: () => {},
    setSearching: () => {},
    setResultsTruncated: () => {},
    setDiscovered: () => {},
    pathQuery: undefined,
    parsed: queryTools.parseQuery("bar"),
    query: "bar",
    minQuery: 3,
    dir: undefined,
    showHidden: false,
    reloadKey: 0,
    visits: {},
    tick: 0,
    queryController,
    searchActive: true,
    dataGeneration: () => "before",
    DEBOUNCE_MS: 0,
    SHORTLIST: 60,
    coarseScore: () => 0,
    relativeDepth,
    isUnindexedScope: () => false,
    statEntry: makeEntry,
    validateRecentEntries: createRecentValidator(async (full) =>
      makeEntry(full),
    ),
    readUsageMetaResult: async () => ({ meta: new Map(), complete: true }),
    rememberDiscovered: async () => [],
    searchPathResult: async (
      _query: string,
      opts: { onBatch?: (paths: string[]) => Promise<void> },
    ) => {
      if (opts.onBatch) {
        for (let i = 0; i < paths.length; i += 60)
          await opts.onBatch(paths.slice(i, i + 60));
        return { paths: [], truncated: false };
      }
      return { paths, truncated: false };
    },
  };
  // Real React replays startup effects in Strict Mode, as Raycast develop does.
  const lifecycleCode = transformSync(
    source.slice(
      source.indexOf("  const scopeController ="),
      source.indexOf("  const navigate ="),
    ),
    { loader: "ts" },
  ).code;
  const lifecycleDependencies = {
    ...discoveryDependencies,
    useEffect: React.useEffect,
    useMemo: React.useMemo,
    useState: React.useState,
    useCallback: React.useCallback,
    createElement: React.createElement,
    programmaticEdit: { current: false },
    setHistoryIndex: () => {},
    searchPathResult: async (
      query: string,
      opts: Parameters<typeof runSpotlightSearch>[1],
    ) =>
      runSpotlightSearch(query, opts, async (args) => {
        if (args.includes("-name"))
          return args.at(-1) === "foo_bar" ? "/foo/foo_bar\0" : "";
        return args.at(-1) ===
          'kMDItemFSName == "*f*"cd && kMDItemFSName == "*o*"cd && kMDItemFSName == "*b*"cd'
          ? "/foo/foo_bar\0/foo/bof.txt\0"
          : "";
      }),
  };
  const historyInputCode = transformSync(
    source.slice(
      source.indexOf("  const setQueryProgrammatically ="),
      source.indexOf("  const parent = dir"),
    ),
    { loader: "ts" },
  ).code;
  const Lifecycle = new Function(
    ...Object.keys(lifecycleDependencies),
    `return function Lifecycle() {
      const [searchText, setSearchText] = useState("");
      const [reloadKey, setReloadKey] = useState(0);
      const [found, setFound] = useState([]);
      const [searching, setSearching] = useState(false);
      const query = searchText.trim();
      const parsed = parseQuery(searchText);
      ${lifecycleCode}
      ${inputCode}
      ${historyInputCode}
      ${discoveryCode}
      return createElement("search", {
        change: onSearchTextChange,
        historyChange: setQueryProgrammatically,
        refresh: () => setReloadKey(key => key + 1),
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
  const settle = () => act(() => new Promise((r) => setTimeout(r, 100)));
  const mount = () =>
    act(() => {
      renderer = create(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(Lifecycle),
        ),
      );
    });
  const currentSearch = () => renderer.root.findByType("search");
  try {
    await mount();
    await act(() => {
      for (const query of ["f", "fo", "foo", "foob"])
        currentSearch().props.change(query);
    });
    await settle();
    assert(
      currentSearch().props.found.some(
        (entry: Entry) => entry.path === "/foo/foo_bar",
      ),
      "fast first-run typing finds a fuzzy filename without an intermediate prefix search or setup cache",
    );
    await act(() => currentSearch().props.change("foo_bar"));
    await settle();
    assert(
      currentSearch().props.found.some(
        (entry: Entry) => entry.path === "/foo/foo_bar",
      ),
      "first launch finds an exact Spotlight match without running setup",
    );
    await act(() => currentSearch().props.refresh());
    await settle();
    assert(
      currentSearch().props.found.length === 1,
      "the setup refresh keeps the current query searchable",
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
    await mount();
    await act(() => currentSearch().props.change("foo_bar"));
    await settle();
    assert(
      currentSearch().props.found.length === 1,
      "reopening the extension does not require another setup run",
    );
  } finally {
    await act(() => renderer?.unmount());
    testGlobals.IS_REACT_ACT_ENVIRONMENT = previousAct;
  }
  const exactCode = transformSync(
    source.slice(
      source.indexOf("  useEffect(() => {\n    if (exactPath === undefined)"),
      source.indexOf("  const exactReady ="),
    ),
    { loader: "ts" },
  ).code;
  let stopExact: (() => void) | undefined;
  let exactSignal: AbortSignal | undefined;
  let exactPublished = false;
  let finishExact = () => {};
  const exactWaiting = new Promise<void>((resolve) => {
    finishExact = resolve;
  });
  const exactDependencies = {
    useEffect: (run: () => () => void) => {
      stopExact = run();
    },
    exactPath: "/foo/bar",
    typedDirectory: { entries: [] },
    queryController: new AbortController(),
    reloadKey: 0,
    setExactEntry: () => {
      exactPublished = true;
    },
    validateRecentEntries: async (
      _paths: unknown,
      opts: { signal: AbortSignal },
    ) => {
      exactSignal = opts.signal;
      await exactWaiting;
      return { entries: [makeEntry("/foo/bar")] };
    },
  };
  new Function(...Object.keys(exactDependencies), exactCode)(
    ...Object.values(exactDependencies),
  );
  stopExact?.();
  finishExact();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert(
    exactSignal?.aborted === true &&
      !exactPublished &&
      !exactDependencies.queryController.signal.aborted,
    "exact-path cleanup cancels its read without poisoning the next effect setup",
  );
  new Function(...Object.keys(discoveryDependencies), discoveryCode)(
    ...Object.values(discoveryDependencies),
  );
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert(
    liveFound.length === 125,
    "the browser keeps collecting live matches beyond the first sixty results",
  );
  stopDiscovery?.();
  let capReported = false;
  let metadataPaths = 0;
  let finishCap = () => {};
  const capDone = new Promise<void>((resolve) => {
    finishCap = resolve;
  });
  const capDependencies = {
    ...discoveryDependencies,
    queryController: new AbortController(),
    setResultsTruncated: (value: boolean) => {
      capReported ||= value;
    },
    setSearching: (value: boolean) => {
      if (!value) finishCap();
    },
    readUsageMetaResult: async (paths: string[]) => {
      metadataPaths += paths.length;
      return { meta: new Map(), complete: true };
    },
    searchPathResult: async (
      _query: string,
      opts: { onBatch: (paths: string[]) => Promise<void> },
    ) => {
      for (let i = 0; i < 6000; i += 60)
        await opts.onBatch(
          Array.from({ length: 60 }, (_, j) => `/foo/bar${i + j}`),
        );
      return { paths: [], truncated: false };
    },
  };
  new Function(...Object.keys(capDependencies), discoveryCode)(
    ...Object.values(capDependencies),
  );
  await capDone;
  assert(
    liveFound.length === 500 && capReported && metadataPaths === 500,
    "live result retention and metadata enrichment stop at the result cap and report partial coverage",
  );
  stopDiscovery?.();
  liveFound = [];
  const limitedCache = await createRecentValidator(async (full) =>
    makeEntry(full),
  )(
    Array.from({ length: 501 }, (_, i) => ({ path: `/foo/bar${i}` })),
    { limit: 500, continuous: true },
  );
  assert(
    limitedCache.entries.length === 500 &&
      limitedCache.partial &&
      limitedCache.limited === true,
    "concurrent cached reads report a cap even when the last workers finish together",
  );
  let unstick = () => {};
  const stuck = new Promise<void>((resolve) => {
    unstick = resolve;
  });
  const stalledController = new AbortController();
  const stalledDependencies = {
    ...discoveryDependencies,
    queryController: stalledController,
    validateRecentEntries: createRecentValidator(async (full) => {
      if (full === paths[0]) await stuck;
      return makeEntry(full);
    }),
  };
  new Function(...Object.keys(stalledDependencies), discoveryCode)(
    ...Object.values(stalledDependencies),
  );
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert(
    liveFound.some((entry) => entry.path === paths[124]),
    "one stalled file cannot block later Spotlight batches",
  );
  stalledController.abort();
  const beforeLate = liveFound.length;
  unstick();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert(
    liveFound.length === beforeLate,
    "a cancelled query cannot publish a formerly stalled file",
  );
  stopDiscovery?.();
  for (const query of ["foofolder ext:pdf", "foofolder baz -f"]) {
    liveFound = [];
    const folder = "/foo/foofolder";
    const target = `${folder}/baz.pdf`;
    const expansionDependencies = {
      ...discoveryDependencies,
      query,
      parsed: queryTools.parseQuery(query),
      queryController: new AbortController(),
      validateRecentEntries: createRecentValidator(async (full) => ({
        ...makeEntry(full),
        isDirectory: full === folder,
      })),
      searchPathResult: async (
        _query: string,
        opts: { onBatch: (paths: string[]) => Promise<void> },
      ) => {
        await opts.onBatch([folder]);
        return { paths: [], truncated: false };
      },
      listUnder: async (
        _roots: string[],
        opts: { onBatch: (paths: string[]) => Promise<void> },
      ) => {
        await opts.onBatch([target]);
        return { paths: [], truncated: false };
      },
    };
    new Function(...Object.keys(expansionDependencies), discoveryCode)(
      ...Object.values(expansionDependencies),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert(
      liveFound.some((entry) => entry.path === target),
      `${query} expands a matching folder before applying result filters`,
    );
    stopDiscovery?.();
  }
  liveFound = [];
  const expansionController = new AbortController();
  const roots = ["/foo/foofolder-stalled", "/foo/foofolder-healthy"];
  const healthyFile = `${roots[1]}/baz.pdf`;
  const parallelExpansionDependencies = {
    ...discoveryDependencies,
    query: "foofolder ext:pdf",
    parsed: queryTools.parseQuery("foofolder ext:pdf"),
    queryController: expansionController,
    validateRecentEntries: createRecentValidator(async (full) => ({
      ...makeEntry(full),
      isDirectory: roots.includes(full),
    })),
    searchPathResult: async (
      _query: string,
      opts: { onBatch: (paths: string[]) => Promise<void> },
    ) => {
      await opts.onBatch(roots);
      return { paths: [], truncated: false };
    },
    listUnder: async (
      [root]: string[],
      opts: {
        signal: AbortSignal;
        onBatch: (paths: string[]) => Promise<void>;
      },
    ) => {
      if (root === roots[0])
        await new Promise<void>((resolve) =>
          opts.signal.addEventListener("abort", () => resolve(), {
            once: true,
          }),
        );
      else await opts.onBatch([healthyFile]);
      return { paths: [], truncated: false };
    },
  };
  new Function(...Object.keys(parallelExpansionDependencies), discoveryCode)(
    ...Object.values(parallelExpansionDependencies),
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert(
    liveFound.some((entry) => entry.path === healthyFile),
    "one stalled expansion root cannot block another matching folder",
  );
  expansionController.abort();
  stopDiscovery?.();

  for (const hasResults of [true, false]) {
    let searchError: string | undefined;
    let searchPartial: string | undefined;
    const failureDependencies = {
      ...discoveryDependencies,
      queryController: new AbortController(),
      setSearchError: (error?: string) => {
        searchError = error;
      },
      setSearchPartial: (partial?: string) => {
        searchPartial = partial;
      },
      validateRecentEntries: createRecentValidator(async (full) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return makeEntry(full);
      }),
      searchPathResult: async (
        _query: string,
        opts: { onBatch: (paths: string[]) => Promise<void> },
      ) => {
        if (hasResults) await opts.onBatch([paths[0]]);
        return {
          paths: [],
          truncated: false,
          error: "Spotlight search failed",
        };
      },
    };
    new Function(...Object.keys(failureDependencies), discoveryCode)(
      ...Object.values(failureDependencies),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert(
      hasResults
        ? !searchError && !!searchPartial
        : !!searchError && !searchPartial,
      hasResults
        ? "a source failure with delayed valid results is partial"
        : "a source failure without valid results remains an error",
    );
    stopDiscovery?.();
  }
  let metadataError: string | undefined;
  let metadataPartial: string | undefined;
  const timeoutDependencies = {
    ...discoveryDependencies,
    queryController: new AbortController(),
    setFoundUsageError: (error?: string) => {
      metadataError = error;
    },
    setFoundUsagePartial: (partial?: string) => {
      metadataPartial = partial;
    },
    readUsageMetaResult: async () => ({
      meta: new Map(),
      complete: false,
      partial: "Timed out",
    }),
  };
  new Function(...Object.keys(timeoutDependencies), discoveryCode)(
    ...Object.values(timeoutDependencies),
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert(
    !metadataError && !!metadataPartial,
    "metadata timeouts remain partial rather than becoming process failures",
  );
  stopDiscovery?.();
  const rankStart = source.indexOf("  const rankSources = useCallback(");
  const rankEnd = source.indexOf("  /** Results available", rankStart);
  const rankCode = transformSync(source.slice(rankStart, rankEnd), {
    loader: "ts",
  }).code;
  const rankDependencies = {
    ...queryTools,
    path,
    scoreEntry,
    entryStoragePath,
    relativeDepth,
    useCallback: (run: unknown) => run,
    dir: "/foo",
    canonicalDir: "/private/foo",
    learnedSet: new Set(["/elsewhere/bar"]),
    pathQuery: undefined,
    effectiveQuery: "-d",
    parsed: queryTools.parseQuery("-d"),
    visits: {},
    tick: 0,
    compare: () => 0,
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
      "discoveredCandidates",
      "discoveredCache",
      {
        discovered: [
          "/foo/bar",
          "/foo/bar/baz",
          "/private/foo/bar",
          "/private/foo/bar/baz",
          "/foobar/bar",
        ],
      },
    ],
    [
      "shortcutCandidates",
      "shortcutCache",
      {
        shortcutIndex: [
          "/foo/bar",
          "/foo/bar/baz",
          "/private/foo/bar",
          "/private/foo/bar/baz",
          "/foobar/bar",
        ].map((path) => ({ path })),
      },
    ],
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
    const start = source.indexOf(`  const ${variable} =`);
    const code = transformSync(
      source.slice(start, source.indexOf(`  const ${end} =`, start)),
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
  for (const query of ["cloud", "foo -d", "foo ext:pdf", ".foo bar"]) {
    let recursiveWork = 0;
    const scopedDiscovery = {
      ...discoveryDependencies,
      dir: "/foo",
      query,
      parsed: queryTools.parseQuery(query),
      queryController: new AbortController(),
      searchPathResult: async () => {
        recursiveWork++;
        return { paths: [], truncated: false };
      },
      walkSearch: async () => {
        recursiveWork++;
        return { paths: [], truncated: false };
      },
      listUnder: async () => {
        recursiveWork++;
        return { paths: [], truncated: false };
      },
      readDirectoryAsync: async () => {
        recursiveWork++;
        return { entries: [], truncated: 0 };
      },
    };
    new Function(...Object.keys(scopedDiscovery), discoveryCode)(
      ...Object.values(scopedDiscovery),
    );
    await new Promise((resolve) => setTimeout(resolve, 25));
    stopDiscovery?.();
    assert(
      recursiveWork === 0,
      `folder query ${query} does not start recursive discovery or Spotlight name search`,
    );
  }
  const mergeStart = source.indexOf("  /** Delayed search results");
  const mergeEnd = source.indexOf("  const markVisited", mergeStart);
  const mergeCode = transformSync(source.slice(mergeStart, mergeEnd), {
    loader: "ts",
  }).code;
  const metadataEntry = { ...entries[0], useCount: 42, lastUsedMs: Date.now() };
  const merged = new Function(
    "useMemo",
    "pathQuery",
    "found",
    "instantRows",
    "rankSources",
    "compare",
    "LIVE_RESULTS",
    mergeCode + "\nreturn rows;",
  )(
    (run: () => unknown) => run(),
    undefined,
    [metadataEntry],
    rank([entries[0]]),
    rank,
    () => 0,
    searchLimits.LIVE_RESULTS,
  ) as { entry: Entry }[];
  assert(
    merged.length === 1 &&
      merged[0].entry.useCount === 42 &&
      merged[0].entry.lastUsedMs === metadataEntry.lastUsedMs,
    "Spotlight usage enrichment survives when the same result becomes available from the cache",
  );
  assert(
    !source.includes("standardPlaces()"),
    "starting-place discovery does not run synchronous filesystem calls during render",
  );
  const start = source.indexOf(
    "  useEffect(() => {",
    source.indexOf("// Load only visits"),
  );
  const end =
    source.indexOf("  }, [reloadKey]);", start) + "  }, [reloadKey]);".length;
  const effect = transformSync(source.slice(start, end), { loader: "ts" }).code;
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
  const backgroundStart = source.indexOf("  useEffect(() => {", end);
  const backgroundEnd =
    source.indexOf("  }, [reloadKey]);", backgroundStart) +
    "  }, [reloadKey]);".length;
  const background = transformSync(
    source.slice(backgroundStart, backgroundEnd),
    { loader: "ts" },
  ).code;
  const queryEnd =
    source.indexOf("  }, [parsed.normalized, dir]);") +
    "  }, [parsed.normalized, dir]);".length;
  const queryStart = source.lastIndexOf("  useEffect(() => {", queryEnd);
  const queryEffect = transformSync(source.slice(queryStart, queryEnd), {
    loader: "ts",
  }).code;
  const savedPaths = ["/foo/foo_repository"];
  let discovered: string[] = [];
  const discoveredRef = { current: [] as string[] };
  const cacheDependencies = {
    useEffect: (run: () => unknown) => run(),
    reloadKey: 0,
    dataGeneration: () => "before",
    loadSearches: async () => [],
    loadShortcutIndex: async () => ({ shortcuts: [], scannedAt: 0 }),
    loadAbbreviations: async () => ({}),
    loadSharedIndex: () => ({ paths: [] }),
    loadDiscovered: () => savedPaths,
    driveIndexCaveat: () => undefined,
    statEntry: () => undefined,
    setBackgroundPending: () => {},
    setHistory: () => {},
    setShortcuts: () => {},
    setShortcutsScannedAt: () => {},
    setDriveIndexMessage: () => {},
    setAbbreviations: () => {},
    setSharedIndex: () => {},
    setDiscovered: (paths: string[]) => {
      discovered = paths;
    },
    discoveredRef,
    setGeneration: () => {},
    parsed: queryTools.parseQuery("foorep"),
    dir: undefined,
  };
  const runCacheCode = (code: string, extra: Record<string, unknown> = {}) => {
    const dependencies = { ...cacheDependencies, ...extra };
    return new Function(...Object.keys(dependencies), code)(
      ...Object.values(dependencies),
    );
  };
  runCacheCode(background);
  await new Promise((resolve) => setImmediate(resolve));
  assert(
    discovered.includes(savedPaths[0]),
    "startup loads persisted discovered paths",
  );
  let synchronousStats = 0;
  runCacheCode(background, {
    loadShortcutIndex: async () => ({
      shortcuts: [{ path: "/foo/bar", name: "bar", target: "/foo/baz" }],
      scannedAt: 1,
    }),
    statEntry: () => {
      synchronousStats++;
      return undefined;
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert(
    synchronousStats === 0,
    "loading a newly populated Drive index does not synchronously read every shortcut",
  );
  runCacheCode(queryEffect);
  assert(
    discovered.includes(savedPaths[0]),
    "the first typed query retains the cache loaded at startup",
  );
  const rememberStart = source.indexOf("        void rememberDiscovered(");
  const rememberEnd = source.indexOf(
    "        setFound(shortlist);",
    rememberStart,
  );
  const rememberCode = transformSync(source.slice(rememberStart, rememberEnd), {
    loader: "ts",
  }).code;
  const newPaths = [...savedPaths, "/foo/foo_report"];
  runCacheCode(rememberCode, {
    ranked: [{ path: newPaths[1] }],
    storageGeneration: "before",
    cancelled: false,
    rememberDiscovered: async () => newPaths,
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert(
    discovered.includes(newPaths[1]),
    "completed cache updates appear without editing the query again",
  );
  runCacheCode(queryEffect);
  runCacheCode(queryEffect);
  assert(
    discovered.length === 2,
    "backspace and retyping do not change an already published cache",
  );
  for (const stale of [
    { cancelled: true },
    { storageGeneration: "obsolete" },
  ]) {
    runCacheCode(rememberCode, {
      ranked: [],
      storageGeneration: "before",
      cancelled: false,
      rememberDiscovered: async () => ["/foo/obsolete"],
      ...stale,
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert(
      !discovered.includes("/foo/obsolete"),
      "cancelled or pre-reset cache completions cannot update the current query",
    );
  }
  runCacheCode(rememberCode, {
    ranked: [],
    storageGeneration: "before",
    cancelled: false,
    rememberDiscovered: async () => [],
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert(
    discovered.length === 2,
    "a failed cache save cannot discard already searchable paths",
  );
  for (const stalled of ["loadSearches", "loadAbbreviations"]) {
    let reset = false;
    let latePublications = 0;
    let finish = () => {};
    const waiting = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const values = {
      loadSearches: [],
      loadAbbreviations: {},
      loadShortcutIndex: { shortcuts: [], scannedAt: 0 },
    };
    const backgroundDependencies: Record<string, unknown> = {
      useEffect: (run: () => unknown) => run(),
      reloadKey: 0,
      dataGeneration: () => (reset ? "after" : "before"),
      statEntry: () => undefined,
      loadSharedIndex: () => ({ paths: [] }),
      driveIndexCaveat: () => undefined,
      loadDiscovered: () => [],
    };
    for (const [name, value] of Object.entries(values))
      backgroundDependencies[name] = async () => {
        if (name === stalled) await waiting;
        return value;
      };
    for (const name of [
      "setBackgroundPending",
      "setHistory",
      "setShortcuts",
      "setShortcutsScannedAt",
      "setDriveIndexMessage",
      "setAbbreviations",
      "setDiscovered",
      "setSharedIndex",
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
  const cached = source.slice(
    source.indexOf("/** Previously-surfaced paths"),
    source.indexOf("/** Hidden Home entries"),
  );
  const learnedCode = transformSync(
    source.slice(
      source.indexOf("  const learnedCache ="),
      source.indexOf("  const learnedMatches ="),
    ),
    { loader: "ts" },
  ).code;
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
        continuous: true,
      }),
    [{ path: "/foo/unrelated.txt" }],
    "baz",
    0,
    queryController,
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
