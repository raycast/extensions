import assert from "node:assert/strict";
import test from "node:test";
import createLoader, { type MockValue } from "./load-ts.ts";
import { renderer, findAll } from "./render-ui.ts";

const browser = { id: "chrome", appName: "Google Chrome", engine: "chromium" };
const native = { id: 10, pid: 20, app: browser.appName, title: "Work", "has-ax-reference": true };
const windows = [{ id: "10", title: "Work", tabs: [{ id: "10:ax:one", title: "Docs", url: "https://example.com" }] }];
const { createBrowserSnapshot } = createLoader({})("src/browsers/snapshot.ts");

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test("opening a browser shows root tabs immediately while its live query is pending", () => {
  const parent = renderer({
    windows: [native],
    metadataByPid: {},
    browserCounts: {},
    browserTabs: { chrome: windows },
    axWindowsByPid: {},
  });
  const target = findAll(parent.render(), (node) => node.props.title === "Show Browser Tabs and Windows")[0].props
    .target;
  let result: MockValue;
  let query: () => Promise<unknown>;
  const child = renderer(
    {},
    {
      "@raycast/utils": {
        useCachedPromise: (load, args, options) => {
          query = () => load(...args);
          return { data: result === undefined ? options.initialData : result, isLoading: true, revalidate: query };
        },
      },
      "./browsers/client": { getBrowserWindows: async () => new Promise(() => {}) },
    },
    "src/browser-windows.tsx",
    "BrowserWindowsView",
    target.props,
  );
  const tree = child.render();
  void query!();
  assert.deepEqual(
    findAll(tree, (node) => node.type === child.ui.List.Item).map((row) => row.props.title),
    ["Docs"],
  );
  result = [];
  assert.equal(
    findAll(child.render(), (node) => node.type === child.ui.List.Item).length,
    0,
    "a completed empty response replaces the seed",
  );
  parent.render().props.onSearchTextChange("docs");
  const searchTarget = findAll(parent.render(), (node) => node.props.title === "Show Browser Tabs and Windows")[0].props
    .target;
  assert.equal(
    searchTarget.props.initialSnapshot.windows,
    windows,
    "content search navigation also carries known tabs",
  );
});

test("root and browser navigation share an identical in-flight query but later refreshes read live tabs", async () => {
  let calls = 0;
  let pending = deferred<MockValue[]>();
  const { getBrowserWindows } = createLoader({
    "./native": {
      getNativeBrowserWindows: () => {
        calls++;
        return pending.promise;
      },
    },
  })("src/browsers/client.ts");
  const root = getBrowserWindows(browser, [native]);
  const child = getBrowserWindows(browser, [{ ...native }]);
  assert.equal(calls, 1, "opening the browser must not queue a duplicate tab scan");
  pending.resolve(windows);
  assert.deepEqual(await root, await child);
  pending = deferred<MockValue[]>();
  const refresh = getBrowserWindows(browser, [native]);
  assert.equal(calls, 2, "completed queries must not hide tab changes behind a time cache");
  pending.resolve([]);
  assert.deepEqual(await refresh, []);
});

test("different native snapshots stay independent and failed queries can be retried", async () => {
  const requests: ReturnType<typeof deferred<MockValue[]>>[] = [];
  const { getBrowserWindows } = createLoader({
    "./native": {
      getNativeBrowserWindows: () => {
        const pending = deferred<MockValue[]>();
        requests.push(pending);
        return pending.promise;
      },
    },
  })("src/browsers/client.ts");
  const original = getBrowserWindows(browser, [native]);
  const changed = getBrowserWindows(browser, [{ ...native, pid: 21 }]);
  assert.equal(requests.length, 2);
  const failure = assert.rejects(original, /Unavailable/);
  requests[0].reject(new Error("Unavailable"));
  requests[1].resolve([]);
  await Promise.all([failure, changed]);
  const retry = getBrowserWindows(browser, [native]);
  assert.equal(requests.length, 3);
  requests[2].resolve(windows);
  assert.equal((await retry).length, 1);
});

test("browser navigation consumes its parent snapshot once and refreshes from live native data", async () => {
  const scans: MockValue[] = [];
  let refresh!: () => Promise<unknown>;
  const view = renderer(
    {},
    {
      "@raycast/utils": {
        useCachedPromise: (load, args, options) => {
          refresh = () => load(...args);
          return { data: options.initialData, isLoading: false, revalidate: refresh };
        },
      },
      "./browsers/client": {
        getBrowserWindows: async (_browser, nativeWindows) => {
          scans.push(nativeWindows);
          return windows;
        },
      },
    },
    "src/browser-windows.tsx",
    "BrowserWindowsView",
    { browser, initialSnapshot: createBrowserSnapshot(browser, { nativeWindows: [native], windows }) },
  );
  view.render();
  await refresh();
  await refresh();
  assert.deepEqual(scans, [[native], undefined]);
});
