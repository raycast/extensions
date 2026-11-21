import fs from "node:fs";
import { transformSync } from "esbuild";
import * as React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { missingUsagePaths } from "../src/lib/progress";
import { Entry } from "../src/lib/types";
import { UsageMeta, UsageMetaResult } from "../src/lib/spotlight";
import { between } from "./source-slice";

/** Slow macOS calls may warm the cache, but must not hold or rerank this query. */
export async function folderUsageChecks(
  assert: (ok: boolean, label: string) => void,
) {
  const source = fs.readFileSync("src/components/browser.tsx", "utf8");
  const code = transformSync(
    between(
      source,
      "  // Show directory entries before loading usage metadata.",
      "  /**\n   * The indexed name search.",
    ),
    { loader: "ts" },
  ).code;
  const entries: Entry[] = Array.from({ length: 91 }, (_, i) => ({
    path: `/folder/file${i}`,
    name: `file${i}`,
    isDirectory: false,
    isSymlink: false,
    size: 1,
    mtimeMs: i,
    birthtimeMs: 0,
  }));
  let cache = new Map<string, UsageMeta>([[entries[0].path, { useCount: 40 }]]);
  let currentEntries = entries;
  let children: Entry[] = [];
  let firstRenderCount: number | undefined;
  let pending = false;
  let requested: string[] = [];
  let writes = 0;
  let finish: (result: UsageMetaResult) => void = () => {};
  const scopeController = new AbortController();
  function View({ queryKey }: { queryKey: string }) {
    const deps = {
      useEffect: React.useEffect,
      useMemo: React.useMemo,
      dir: "/folder",
      showHidden: false,
      reloadKey: 0,
      queryKey,
      searchActive: true,
      scopeController,
      directoryListing: { entries: currentEntries, truncated: 0 },
      dataGeneration: () => 0,
      missingUsagePaths,
      LIVE_RESULTS: 50,
      FOLDER_USAGE_BUDGET_MS: 3000,
      readCachedUsage: () => new Map(cache),
      readUsageMetaResult: (paths: string[]) => {
        requested = paths;
        return new Promise<UsageMetaResult>((resolve) => {
          finish = resolve;
        });
      },
      writeCachedUsage: async (_dir: string, next: Map<string, UsageMeta>) => {
        cache = next;
        writes++;
      },
      setChildren: (next: Entry[] | ((old: Entry[]) => Entry[])) => {
        children = typeof next === "function" ? next(children) : next;
      },
      setChildrenUsagePending: (next: boolean) => {
        pending = next;
      },
      setChildrenFor: () => {},
      setFolderEntriesOmitted: () => {},
      setFolderError: () => {},
      setFolderMetaError: () => {},
      setFolderMetaPartial: () => {},
    };
    const prepared = new Function(
      ...Object.keys(deps),
      code + '\nreturn typeof children === "undefined" ? undefined : children;',
    )(...Object.values(deps)) as Entry[] | undefined;
    firstRenderCount ??= prepared?.length ?? 0;
    if (prepared) children = prepared;
    return null;
  }
  let renderer: ReactTestRenderer | undefined;
  async function run(queryKey: string) {
    await act(() => {
      const element = React.createElement(View, { queryKey });
      if (renderer) renderer.update(element);
      else renderer = create(element);
    });
  }
  async function stop() {
    await act(() => {
      renderer?.unmount();
      renderer = undefined;
    });
  }
  const globals = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const previous = globals.IS_REACT_ACT_ENVIRONMENT;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    await run("first");
    assert(
      firstRenderCount === 91,
      "folder children and cached usage are prepared in the same render as directory readiness",
    );
    assert(
      children.length === 91 && !pending,
      "folder names and stats are ready while optional usage metadata is unresolved",
    );
    assert(
      children[0].useCount === 40,
      "cached usage contributes before the first folder frame",
    );
    assert(
      requested.length === 50,
      "a folder metadata pass checks at most 50 uncached paths",
    );
    const published = children;
    finish({
      meta: new Map([[entries[1].path, { useCount: 99 }]]),
      complete: true,
    });
    await Promise.resolve();
    await Promise.resolve();
    assert(
      children === published && children[1].useCount === undefined,
      "late usage metadata cannot replace or reorder the displayed query",
    );
    assert(
      writes === 1 && cache.get(entries[1].path)?.useCount === 99,
      "late usage metadata is saved for the next query",
    );
    currentEntries = entries.map((entry) => ({ ...entry, mtimeMs: 1234 }));
    await run("first");
    assert(
      children[0].mtimeMs === 1234 && children[1].useCount === undefined,
      "a changed directory snapshot updates stats immediately but retains this query's frozen usage",
    );
    await run("second");
    assert(
      children[1].useCount === 99,
      "the next folder query uses the warmed usage cache",
    );
    await stop();
    finish({
      meta: new Map([[entries[2].path, { useCount: 55 }]]),
      complete: true,
    });
    await Promise.resolve();
    await Promise.resolve();
    assert(writes === 1, "a released screen cannot write late usage metadata");
    cache = new Map();
    await run("no-usage");
    finish({ meta: new Map(), complete: true });
    await Promise.resolve();
    await Promise.resolve();
    await run("later");
    assert(
      requested[0] === entries[50].path,
      "successfully checked files with no usage cannot starve later metadata candidates",
    );
    await stop();
    cache = new Map();
    await run("failed-usage");
    finish({ meta: new Map(), complete: false, error: "unavailable" });
    await Promise.resolve();
    await Promise.resolve();
    await run("retry");
    assert(
      cache.size === 0 && requested[0] === entries[0].path,
      "failed metadata reads are not cached as successful negative results",
    );
  } finally {
    await stop();
    globals.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
