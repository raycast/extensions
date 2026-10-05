import fs from "node:fs";
import { transformSync } from "esbuild";
import { between } from "./source-slice";
import { RowHandlers } from "../src/components/row";
import { Entry } from "../src/lib/types";
import { runWithBestEffortSideEffect } from "../src/lib/best-effort-action";
import {
  applyEntryStorageUpdate,
  entryStoragePath,
  entryStorageSource,
  EntryStorageUpdate,
} from "../src/lib/entry-identity";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** Exercise shipped action handlers with controlled resolution/write races. */
export async function actionStorageChecks(
  assert: (ok: boolean, label: string) => void,
) {
  const source = fs.readFileSync("src/components/browser.tsx", "utf8");
  const code = transformSync(
    between(source, "  const handlers: RowHandlers", "  // Reset row IDs"),
    { loader: "ts" },
  ).code;
  const entry: Entry = {
    path: "/shortcut/report.txt",
    storagePath: "/target/report.txt",
    name: "report.txt",
    isDirectory: false,
    isSymlink: true,
    size: 0,
    mtimeMs: 0,
    birthtimeMs: 0,
  };
  const use = <T>(value: () => T) => value();
  const noop = () => {};
  const turn = () => new Promise<void>((done) => setImmediate(done));

  const resolverCode = transformSync(
    between(source, "  const resolveActionStoragePath =", "\n  useEffect("),
    { loader: "ts" },
  ).code;
  let actionGeneration = "before";
  let updates: ReadonlyMap<string, EntryStorageUpdate> = new Map();
  let resolution = deferred<string>();
  const resolverDeps = {
    useCallback: <T>(value: T) => value,
    dataGeneration: () => actionGeneration,
    currentEntryStoragePath: () => resolution.promise,
    entryStoragePath,
    entryStorageSource,
    LIVE_RESULTS: 50,
    setActionStoragePaths: (
      update: (
        previous: ReadonlyMap<string, EntryStorageUpdate>,
      ) => ReadonlyMap<string, EntryStorageUpdate>,
    ) => {
      updates = update(updates);
    },
  };
  const resolveActionStoragePath = new Function(
    ...Object.keys(resolverDeps),
    resolverCode + "\nreturn resolveActionStoragePath;",
  )(...Object.values(resolverDeps)) as (entry: Entry) => Promise<string>;
  let resolvePending = resolveActionStoragePath(entry);
  resolution.resolve("/new/report.txt");
  await resolvePending;
  let corrected = applyEntryStorageUpdate(entry, updates.get(entry.path));
  assert(
    corrected.storagePath === "/new/report.txt",
    "the action resolver publishes a changed live identity for the selected snapshot",
  );
  resolution = deferred<string>();
  resolvePending = resolveActionStoragePath(corrected);
  resolution.resolve("/latest/report.txt");
  await resolvePending;
  corrected = applyEntryStorageUpdate(entry, updates.get(entry.path));
  assert(
    corrected.storagePath === "/latest/report.txt",
    "a second action on the corrected row still updates the original snapshot",
  );
  resolution = deferred<string>();
  resolvePending = resolveActionStoragePath(corrected);
  actionGeneration = "after";
  updates = new Map();
  resolution.resolve("/after-reset/report.txt");
  await resolvePending;
  assert(
    updates.size === 0,
    "an identity resolution started before deletion cannot republish row updates",
  );

  for (const action of ["onTogglePin", "onResetRanking", "onLearn"] as const) {
    for (const phase of ["resolve", "write"] as const) {
      let generation = "before";
      let publications = 0;
      let successes = 0;
      const resolution = deferred<string>();
      const write = deferred<unknown>();
      const writes: { key: string; generation: string }[] = [];
      const mutation = (_path: string, key: string, captured: string) => {
        writes.push({ key, generation: captured });
        return write.promise;
      };
      const deps = {
        useMemo: use,
        onToggleHidden: noop,
        dir: undefined,
        parent: undefined,
        searchText: "report",
        query: "report",
        parsed: { normalized: "report" },
        returnToStart: noop,
        history: [],
        historyIndex: -1,
        markVisited: noop,
        commitSearch: noop,
        setQueryProgrammatically: noop,
        navigate: noop,
        rebuilding: false,
        setReloadKey: noop,
        dataGeneration: () => generation,
        resolveActionStoragePath: () => resolution.promise,
        togglePin: mutation,
        resetVisit: mutation,
        recordAbbreviation: (
          _query: string,
          path: string,
          captured: string,
          key: string,
        ) => mutation(path, key, captured),
        setPins: () => publications++,
        setVisitLog: () => publications++,
        setAbbreviations: () => publications++,
        Toast: { Style: { Success: "success" } },
        showToast: () => successes++,
      };
      const handlers = new Function(
        ...Object.keys(deps),
        code + "\nreturn handlers;",
      )(...Object.values(deps)) as RowHandlers;
      const pending = handlers[action]!(entry);
      if (phase === "resolve") generation = "after";
      resolution.resolve(entry.storagePath!);
      await turn();
      if (phase === "write") generation = "after";
      write.resolve({});
      await pending;
      assert(
        writes.length === 1 &&
          writes[0].generation === "before" &&
          writes[0].key === entry.storagePath &&
          publications === 0 &&
          successes === 0,
        `${action} captures its generation before resolving and ignores a reset during ${phase}`,
      );
    }
  }

  // Both learning and visits share one identity, and stalled identity lookup
  // remains optional work: the native Open must already have started.
  for (const action of ["onOpen", "onDescend"] as const) {
    const resolution = deferred<string>();
    let lookups = 0;
    let primaryStarted = false;
    let brokenStorage = false;
    const keys: string[] = [];
    const deps = {
      useMemo: use,
      onToggleHidden: noop,
      dir: undefined,
      parent: undefined,
      searchText: "report",
      query: "report",
      parsed: { normalized: "report" },
      returnToStart: noop,
      history: [],
      historyIndex: -1,
      markVisited: async (_path: string, _generation: string, key: string) => {
        keys.push(key);
      },
      commitSearch: async (_path: string, _generation: string, key: string) => {
        keys.push(key);
      },
      setQueryProgrammatically: noop,
      navigate: () => {
        primaryStarted = true;
      },
      rebuilding: false,
      setReloadKey: noop,
      dataGeneration: () => {
        if (brokenStorage) throw new Error("Storage unavailable");
        return "current";
      },
      resolveActionStoragePath: () => {
        lookups++;
        return resolution.promise;
      },
      runWithBestEffortSideEffect,
      closeMainWindow: async () => {},
      open: async () => {
        primaryStarted = true;
      },
    };
    const handlers = new Function(
      ...Object.keys(deps),
      code + "\nreturn handlers;",
    )(...Object.values(deps)) as RowHandlers;
    const pending = handlers[action](entry);
    await turn();
    assert(
      primaryStarted && keys.length === 0,
      `${action} proceeds while cloud identity is stalled`,
    );
    resolution.resolve(entry.storagePath!);
    await pending;
    await turn();
    assert(
      lookups === 1 &&
        keys.length === 2 &&
        keys.every((key) => key === entry.storagePath),
      `${action} shares exactly one resolved key across visit and search writes`,
    );
    brokenStorage = true;
    primaryStarted = false;
    let propagated = false;
    try {
      await handlers[action](entry);
      handlers.onUse(entry);
    } catch {
      propagated = true;
    }
    await turn();
    assert(
      primaryStarted && !propagated,
      `${action} and native usage callbacks tolerate a failed generation read`,
    );
  }

  const hookSource = fs.readFileSync(
    "src/components/use-search-history-recording.ts",
    "utf8",
  );
  const hookCode = transformSync(
    between(
      hookSource,
      "  const commitSearch =",
      "  // Record settled queries",
    ),
    { loader: "ts" },
  ).code;
  let generation = "before";
  let publications = 0;
  const learning = deferred<object>();
  const deps = {
    useCallback: <T>(value: T) => value,
    query: "report",
    normalizedQuery: "report",
    dataGeneration: () => generation,
    recordSearch: async () => ["report"],
    recordAbbreviation: () => learning.promise,
    setHistory: noop,
    setAbbreviations: () => publications++,
  };
  const commitSearch = new Function(
    ...Object.keys(deps),
    hookCode + "\nreturn commitSearch;",
  )(...Object.values(deps)) as (
    target: string,
    generation: string,
    key: string,
  ) => Promise<void>;
  const pending = commitSearch(entry.path, generation, entry.storagePath!);
  await turn();
  generation = "after";
  learning.resolve({ report: { [entry.storagePath!]: 1 } });
  await pending;
  assert(
    publications === 0,
    "automatic search learning cannot republish erased abbreviations after deletion",
  );
}
