import assert from "node:assert/strict";
import test from "node:test";
import { createBrowserSnapshot, retainBrowserSnapshot, summarizeBrowserWindows } from "../src/browsers/snapshot";
import type { BrowserConfig, BrowserWindow } from "../src/browsers/types";
import type { Window } from "../src/windows";
import createLoader, { type MockValue } from "./load-ts.ts";

const browser: BrowserConfig = { id: "chrome", appName: "Google Chrome", engine: "chromium" };
const native = (id = 10, pid = 20): Window => ({
  id,
  pid,
  app: browser.appName,
  title: "Work",
  space: 1,
  frame: { x: 0, y: 0, w: 600, h: 400 },
  "has-ax-reference": true,
});
const windows: BrowserWindow[] = [
  { id: "session:1", nativeWindowId: "10", title: "Work", tabs: [{ id: "session:11", title: "Docs", url: "" }] },
];
const tick = () => new Promise((resolve) => setImmediate(resolve));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test("browser snapshots retain enrichment by identity while keys track current native state", () => {
  const summary = { windows: 1, tabs: 1 };
  const previous = createBrowserSnapshot(browser, { nativeWindows: [native()], windows, summary });
  const updated = { ...native(), space: 3, isMinimized: true, title: "Renamed" };
  const retained = retainBrowserSnapshot(previous, [updated, { ...native(99), app: "Safari" }]);
  assert.equal(retained.windows, windows);
  assert.equal(retained.summary, summary);
  assert.deepEqual(retained.nativeWindows, [updated]);
  assert.notEqual(retained.key, previous.key);
  assert.equal(retained.key, createBrowserSnapshot(browser, { nativeWindows: [updated] }).key);
});

test("browser snapshots discard closed, unmapped and restarted targets without guessing companion identities", () => {
  const previous = createBrowserSnapshot(browser, {
    nativeWindows: [native(), native(11)],
    windows: [
      ...windows,
      { id: "session:2", nativeWindowId: "11", title: "Closed", tabs: [] },
      { id: "session:3", title: "Unmapped", tabs: [] },
    ],
    summary: { windows: 3 },
  });
  const retained = retainBrowserSnapshot(previous, [native()]);
  assert.deepEqual(retained.windows, windows);
  assert.deepEqual(retained.summary, { windows: 1, tabs: 1 });
  const restarted = retainBrowserSnapshot(previous, [native(10, 99)]);
  assert.equal(restarted.windows, undefined);
  assert.deepEqual(restarted.summary, { windows: 1, tabs: undefined });
  assert.deepEqual(summarizeBrowserWindows([{ ...windows[0], tabListUnavailable: true }]), {
    windows: 1,
    tabs: undefined,
  });
});

test("root loading and browser navigation share a scan, replace the seed with empty data and refresh live after failure", async () => {
  let pending = deferred<BrowserWindow[]>();
  let liveNative = [native()];
  const scans: Window[][] = [];
  let nativeQueries = 0;
  let initial: { current: MockValue } | undefined;
  let result: BrowserWindow[] | undefined;
  let query!: () => Promise<BrowserWindow[]>;
  const load = createLoader({
    "./native": {
      getNativeBrowserWindows: (_browser: BrowserConfig, nativeWindows: Window[]) => {
        scans.push(nativeWindows);
        return pending.promise;
      },
    },
    "../windows": {
      queryWindows: async () => {
        nativeQueries++;
        return liveNative;
      },
    },
    react: {
      useRef: (value: MockValue) => (initial ??= { current: value }),
      useCallback: (fn: MockValue) => fn,
    },
    "@raycast/utils": {
      useCachedPromise: (fn, args, options) => {
        query = async () => {
          result = await fn(...args);
          return result!;
        };
        return { data: result ?? options.initialData, isLoading: true, revalidate: query };
      },
    },
  });
  const { loadWindowData, emptyWindowData } = load("src/window-data.ts");
  const { getBrowserWindows } = load("src/browsers/client.ts");
  const { getAppWindowEvidence } = load("src/app-window-evidence.ts");
  const { useBrowserSnapshot } = load("src/use-browser-snapshot.ts");
  let rootData: MockValue;
  const root = loadWindowData(
    (data: MockValue) => {
      rootData = data;
    },
    {
      queryWindows: async () => [native()],
      getRunningApplicationMetadata: async () => ({}),
      queryAXWindows: async () => [],
      getBrowserWindows,
    },
    { ...emptyWindowData(), windows: [native()], browserTabs: { chrome: windows } },
  );
  await tick();
  const evidence = getAppWindowEvidence(
    { id: "chrome", name: browser.appName, pids: [20], windows: rootData.windows },
    rootData,
  );
  const snapshot = evidence.browser.snapshot;
  assert.equal(
    useBrowserSnapshot(browser, snapshot).data,
    windows,
    "known tabs are available before the scan finishes",
  );
  const child = query();
  assert.equal(scans.length, 1, "root and navigation cross the same scan-sharing seam");
  assert.equal(nativeQueries, 0);
  pending.resolve([]);
  await Promise.all([root, child]);
  assert.deepEqual(rootData.browserTabs.chrome, []);
  assert.deepEqual(useBrowserSnapshot(browser, snapshot).data, [], "completed empty data must replace the seed");

  liveNative = [native(11)];
  pending = deferred<BrowserWindow[]>();
  const failure = assert.rejects(query(), /Unavailable/);
  await tick();
  assert.deepEqual(scans[1], liveNative);
  pending.reject(new Error("Unavailable"));
  await failure;
  pending = deferred<BrowserWindow[]>();
  const retry = query();
  await tick();
  assert.equal(nativeQueries, 2, "both refresh and retry discover native windows again");
  assert.equal(scans.length, 3);
  pending.resolve([]);
  await retry;
});

test("navigation rejects a different browser seed and does not consume an obsolete seed after props change", async () => {
  const original = createBrowserSnapshot(browser, { nativeWindows: [native()], windows });
  const changed = createBrowserSnapshot(browser, { nativeWindows: [native(11)], windows: [] });
  for (const mismatchedBrowser of [false, true]) {
    let initial: { current: MockValue } | undefined;
    let query!: () => Promise<unknown>;
    const scans: MockValue[] = [];
    const load = createLoader({
      react: {
        useRef: (value: MockValue) => (initial ??= { current: value }),
        useCallback: (fn: MockValue) => fn,
      },
      "@raycast/utils": {
        useCachedPromise: (fn, args, options) => {
          query = () => fn(...args);
          return { data: options.initialData };
        },
      },
      "./browsers/client": {
        getBrowserWindows: async (_browser: BrowserConfig, nativeWindows?: Window[]) => {
          scans.push(nativeWindows);
          return [];
        },
      },
    });
    const { useBrowserSnapshot } = load("src/use-browser-snapshot.ts");
    if (mismatchedBrowser) {
      const safari: BrowserConfig = { id: "safari", appName: "Safari", engine: "webkit" };
      assert.equal(useBrowserSnapshot(safari, original).data, undefined);
    } else {
      useBrowserSnapshot(browser, original);
      assert.deepEqual(useBrowserSnapshot(browser, changed).data, []);
    }
    await query();
    assert.deepEqual(scans, [undefined], "mismatched native data must never reach a browser scan");
  }
});
