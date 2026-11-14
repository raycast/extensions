import assert from "node:assert/strict";
import test from "node:test";
import type { MockValue } from "./load-ts.ts";
import createLoader from "./load-ts.ts";
import { renderer, findAll } from "./render-ui.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function hookHarness(cached?: MockValue) {
  let cursor = 0;
  const state: MockValue[] = [];
  let effect!: () => () => void;
  const loads: {
    publish: (data: MockValue) => void;
    pending: ReturnType<typeof deferred<void>>;
    previous: MockValue;
  }[] = [];
  const toasts: MockValue[] = [];
  const writes: MockValue[] = [];
  const load = createLoader({
    "@raycast/api": {
      Cache: class {
        get() {
          return cached && JSON.stringify(cached);
        }
        set(_key: string, value: string) {
          writes.push(JSON.parse(value));
        }
      },
      Toast: { Style: { Failure: "failure" } },
      showToast: async (toast: MockValue) => {
        toasts.push(toast);
      },
    },
    react: {
      useState: (initial: MockValue) => {
        const index = cursor++;
        if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
        return [
          state[index],
          (next: MockValue) => {
            state[index] = typeof next === "function" ? next(state[index]) : next;
          },
        ];
      },
      useEffect: (callback: () => () => void) => {
        effect = callback;
      },
      useCallback: (callback: MockValue) => callback,
    },
    "./window-data": {
      emptyWindowData: createLoader({})("src/window-data.ts").emptyWindowData,
      loadWindowData: (publish: (data: MockValue) => void, _queries: unknown, previous: MockValue) => {
        const pending = deferred<void>();
        loads.push({ publish, pending, previous });
        return pending.promise;
      },
    },
  });
  return {
    loads,
    toasts,
    writes,
    render(enabled = true) {
      cursor = 0;
      return load("src/use-window-search.ts").useWindowSearch(enabled);
    },
    start() {
      return effect();
    },
  };
}

test("initial and cached searches publish fresh windows before browser enrichment finishes", async () => {
  const { emptyWindowData, loadWindowData } = createLoader({})("src/window-data.ts");
  const window = {
    id: 10,
    pid: 20,
    app: "Firefox",
    title: "Current",
    bundlePath: "/Firefox.app",
    "has-ax-reference": true,
  };
  for (const cached of [undefined, { ...emptyWindowData(), windows: [window] }]) {
    const hook = hookHarness(cached);
    hook.render();
    hook.start();
    const browser = deferred<MockValue[]>();
    const loading = loadWindowData(
      hook.loads[0].publish,
      {
        queryWindows: async () => [window],
        getRunningApplicationMetadata: async () => ({}),
        queryAXWindows: async () => [],
        getBrowserSummary: async () => {
          throw new Error("Unexpected summary");
        },
        getBrowserWindows: () => browser.promise,
      },
      hook.loads[0].previous,
    );
    await new Promise((resolve) => setImmediate(resolve));
    const partial = hook.render();
    assert.equal(partial.windows.length, 1);
    assert.deepEqual(partial.browserTabs, {});
    assert.equal(partial.isLoading, true);
    browser.resolve([{ id: "10", title: "Current", tabs: [{ id: "tab:1", title: "Docs", url: "" }] }]);
    await loading;
    hook.loads[0].pending.resolve();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(hook.render().isLoading, false);
    assert.equal(hook.render().windows.length, 1);
    assert.equal(hook.render().browserTabs.firefox[0].tabs[0].title, "Docs");
  }
});

test("fresh app/window data arrives before slow tabs without clearing valid cached browser data", async () => {
  const { emptyWindowData, loadWindowData } = createLoader({})("src/window-data.ts");
  const window = { id: 10, pid: 10, app: "Firefox", title: "Old", "has-ax-reference": true };
  const cached = {
    ...emptyWindowData(),
    windows: [window],
    applicationOrder: [20, 10],
    applications: [{ pid: 20, localizedName: "Notes" }],
    browserCounts: { firefox: { windows: 1, tabs: 2 } },
    browserTabs: { firefox: [{ id: "old", tabs: [{ id: "tab", title: "Docs", url: "https://example.com" }] }] },
  };
  const hook = hookHarness(cached);
  hook.render();
  hook.start();
  const browser = deferred<MockValue[]>();
  const freshWindow = { ...window, title: "Updated" };
  const applications = [
    { pid: 10, localizedName: "Firefox" },
    { pid: 30, localizedName: "Editor" },
  ];
  const loading = loadWindowData(
    hook.loads[0].publish,
    {
      queryWindows: async () => [freshWindow],
      getRunningApplications: async () => applications,
      getApplicationOrder: async () => [30, 10],
      getRunningApplicationMetadata: async () => ({}),
      queryAXWindows: async () => [],
      getBrowserSummary: async () => {
        throw new Error("Unexpected summary");
      },
      getBrowserWindows: () => browser.promise,
    },
    hook.loads[0].previous,
  );
  await new Promise((resolve) => setImmediate(resolve));
  const during = hook.render();
  assert.deepEqual(during.windows, [freshWindow]);
  assert.deepEqual(during.applicationOrder, [30, 10]);
  assert.deepEqual(during.applications, applications);
  assert.deepEqual(during.browserCounts, cached.browserCounts);
  assert.deepEqual(during.browserTabs, cached.browserTabs);
  assert.deepEqual(hook.writes, [], "partial snapshots must not replace the next launch's cache");
  browser.resolve([]);
  await loading;
  hook.loads[0].pending.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(hook.render().browserTabs.firefox, []);
  assert.deepEqual(hook.render().browserCounts.firefox, { windows: 0, tabs: undefined });
  assert.equal(hook.writes.length, 1);
  assert.equal(hook.render().isLoading, false);
});

test("failed refreshes finish loading and cancelled loads cannot finish a newer search", async () => {
  const { emptyWindowData } = createLoader({})("src/window-data.ts");
  const hook = hookHarness();
  hook.render();
  const cancel = hook.start();
  hook.render().refreshWindows();
  cancel();
  hook.render();
  hook.start();
  hook.loads[0].publish({ ...emptyWindowData(), windows: [{ id: 999 }] });
  hook.loads[0].pending.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(hook.render().isLoading, true);
  assert.deepEqual(hook.render().windows, []);
  hook.loads[1].pending.reject(new Error("Window query failed"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(hook.render().isLoading, false);
  assert.equal(hook.toasts.length, 1);
});

test("fresh native identities discard closed-window and restarted-browser enrichment before tabs finish", async () => {
  const { emptyWindowData, loadWindowData } = createLoader({})("src/window-data.ts");
  for (const restarted of [false, true]) {
    const first = { id: 10, pid: 10, app: "Firefox", title: "First", "has-ax-reference": true };
    const previous = {
      ...emptyWindowData(),
      windows: [first, { ...first, id: 11 }, { ...first, id: 30, pid: 30, app: "Google Chrome" }],
      applications: [{ pid: 40, localizedName: "Old windowless app" }],
      browserTabs: {
        firefox: [
          { id: "session:1", nativeWindowId: "10", tabs: [{ id: "one" }] },
          { id: "session:2", nativeWindowId: "11", tabs: [{ id: "two" }] },
          { id: "session:3", tabs: [{ id: "unmapped" }] },
        ],
        chrome: [{ id: "30", tabs: [{ id: "closed" }] }],
      },
      browserCounts: { firefox: { windows: 3 }, chrome: { windows: 1, tabs: 1 } },
      axWindowsByPid: { 40: [{ pid: 40, index: 1, title: "Closed" }] },
    };
    const browser = deferred<MockValue[]>();
    const snapshots: MockValue[] = [];
    const fresh = { ...first, pid: restarted ? 99 : first.pid };
    const loading = loadWindowData(
      (data: MockValue) => snapshots.push(data),
      {
        queryWindows: async () => [fresh],
        getRunningApplications: async () => [{ pid: fresh.pid, localizedName: "Firefox" }],
        getRunningApplicationMetadata: async () => ({}),
        queryAXWindows: async () => [],
        getBrowserSummary: async () => {
          throw new Error("Unexpected summary");
        },
        getBrowserWindows: () => browser.promise,
      },
      previous,
    );
    await new Promise((resolve) => setImmediate(resolve));
    const current = snapshots.at(-1);
    assert.deepEqual(current.windows, [fresh]);
    assert.equal(current.browserTabs.chrome, undefined);
    assert.equal(current.browserCounts.chrome, undefined);
    assert.deepEqual(current.axWindowsByPid, {});
    if (restarted) assert.equal(current.browserTabs.firefox, undefined);
    else
      assert.deepEqual(
        current.browserTabs.firefox.map((window: MockValue) => window.id),
        ["session:1"],
      );
    assert.equal(current.browserCounts.firefox.windows, 1);
    browser.resolve([]);
    await loading;
  }
});

test("a failed refresh retains its latest published core data without persisting a partial cache", async () => {
  const { emptyWindowData } = createLoader({})("src/window-data.ts");
  const cached = { ...emptyWindowData(), windows: [{ id: 10 }], applicationOrder: [20, 10] };
  const hook = hookHarness(cached);
  hook.render();
  hook.start();
  hook.loads[0].publish({ ...emptyWindowData(), windows: [{ id: 11 }] });
  hook.loads[0].pending.reject(new Error("Window query failed"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(hook.render().windows, [{ id: 11 }]);
  assert.deepEqual(hook.writes, []);
  assert.equal(hook.render().isLoading, false);
  assert.equal(hook.toasts.length, 1);
});

test("empty search results show the loading state until pending data has arrived", () => {
  const { emptyWindowData } = createLoader({})("src/window-data.ts");
  let loading = true;
  const view = renderer(emptyWindowData(), {
    "./use-window-search": { useWindowSearch: () => ({ ...emptyWindowData(), isLoading: loading }) },
  });
  view.render().props.onSearchTextChange("github");
  const empty = () => findAll(view.render(), (node) => node.type === view.ui.List.EmptyView)[0];
  assert.equal(empty().props.title, "Getting things ready…");
  loading = false;
  assert.equal(empty().props.title, "No Results");
});
