import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  MAX_FAILED_REFRESHES,
  type TabAction,
  type TabState,
  initialTabState,
  needsFullLoad,
  storeTabKey,
  tabReducer,
  visibleTabs,
  waitForHosts,
} from "../src/lib/tab-store.ts";

interface T {
  host: { key: string; port: number };
  id: number;
  title: string;
}

const tab = (id: number, title = `Tab ${id}`, key = "500", port = 26394): T => ({ host: { key, port }, id, title });
const changed = (a: T[], b: T[]) => JSON.stringify(a) !== JSON.stringify(b);
const reduce = (state: TabState<T>, ...actions: TabAction<T>[]) =>
  actions.reduce((s, a) => tabReducer(s, a, changed), state);
const keys = (state: TabState<T>) => visibleTabs(state).map(storeTabKey);

const loaded = (tabs: T[], startedAt = Number.MAX_SAFE_INTEGER): TabAction<T> => ({ type: "loaded", tabs, startedAt });

describe("full loads", () => {
  test("replace the tabs and clear an error", () => {
    const s = reduce(initialTabState<T>(), { type: "loadFailed", error: new Error("x") }, loaded([tab(1)]));
    assert.deepEqual(keys(s), ["500:1"]);
    assert.equal(s.error, null);
  });

  test("a failed load empties the list so the error view shows (Firefox quit)", () => {
    const s = reduce(initialTabState<T>(), loaded([tab(1), tab(2)]), { type: "loadFailed", error: new Error("gone") });
    assert.deepEqual(keys(s), []);
    assert.ok(s.error);
  });
});

describe("background refreshes", () => {
  test("show changes made in Firefox", () => {
    let s = reduce(initialTabState<T>(), loaded([tab(1, "New Tab")]));
    s = reduce(s, { type: "refreshed", tabs: [tab(1, "test-cloudrun")], startedAt: s.version });
    assert.equal(visibleTabs(s)[0].title, "test-cloudrun");
  });

  test("return the same state object for an unchanged refresh, so nothing re-renders", () => {
    const s = reduce(initialTabState<T>(), loaded([tab(1)]));
    assert.equal(tabReducer(s, { type: "refreshed", tabs: [tab(1)], startedAt: s.version }, changed), s);
  });

  test("are dropped if a full load finished while they were in flight", () => {
    let s = reduce(initialTabState<T>(), loaded([tab(1)]));
    const startedAt = s.version;
    s = reduce(s, loaded([tab(1), tab(2)]));
    s = reduce(s, { type: "refreshed", tabs: [tab(1)], startedAt });
    assert.deepEqual(keys(s), ["500:1", "500:2"]);
  });

  test("clear an error once a refresh works again", () => {
    let s = reduce(initialTabState<T>(), loaded([tab(1)]));
    s = { ...s, error: new Error("transient") };
    s = reduce(s, { type: "refreshed", tabs: [tab(1)], startedAt: s.version });
    assert.equal(s.error, null);
  });

  test("ask for a full load after repeated total failures, instead of hiding them", () => {
    let s = reduce(initialTabState<T>(), loaded([tab(1)]));
    for (let i = 0; i < MAX_FAILED_REFRESHES - 1; i++) s = reduce(s, { type: "refreshFailed", startedAt: s.version });
    assert.equal(needsFullLoad(s), false);
    s = reduce(s, { type: "refreshFailed", startedAt: s.version });
    assert.equal(needsFullLoad(s), true);
    assert.deepEqual(keys(s), ["500:1"], "keeps showing the last tabs until the full load decides");
  });

  test("reset the failure count when one works", () => {
    let s = reduce(initialTabState<T>(), loaded([tab(1)]));
    s = reduce(s, { type: "refreshFailed", startedAt: s.version }, { type: "refreshFailed", startedAt: s.version });
    s = reduce(s, { type: "refreshed", tabs: [tab(1)], startedAt: s.version });
    assert.equal(s.failedRefreshes, 0);
  });
});

describe("closing a tab", () => {
  test("hides it at once", () => {
    const s = reduce(initialTabState<T>(), loaded([tab(1), tab(2)]), { type: "closeStarted", key: "500:1" });
    assert.deepEqual(keys(s), ["500:2"]);
  });

  test("keeps it hidden from a refresh that started before the close", () => {
    let s = reduce(initialTabState<T>(), loaded([tab(1), tab(2)]));
    const startedAt = s.version;
    s = reduce(s, { type: "closeStarted", key: "500:1" }, { type: "refreshed", tabs: [tab(1), tab(2)], startedAt });
    assert.deepEqual(keys(s), ["500:2"]);
  });

  test("keeps it hidden from a refresh that started after the click but before Firefox closed it", () => {
    let s = reduce(initialTabState<T>(), loaded([tab(1), tab(2)]), { type: "closeStarted", key: "500:1" });
    s = reduce(s, { type: "refreshed", tabs: [tab(1), tab(2)], startedAt: s.version });
    assert.deepEqual(keys(s), ["500:2"]);
  });

  test("removes it for good when the close succeeds", () => {
    const s = reduce(
      initialTabState<T>(),
      loaded([tab(1), tab(2)]),
      { type: "closeStarted", key: "500:1" },
      { type: "closeSettled", key: "500:1", ok: true }
    );
    assert.deepEqual(keys(s), ["500:2"]);
    assert.deepEqual(s.closing, []);
  });

  test("brings back only that tab when the close fails, not an empty list", () => {
    const s = reduce(
      initialTabState<T>(),
      loaded([tab(1), tab(2)]),
      { type: "closeStarted", key: "500:1" },
      { type: "closeSettled", key: "500:1", ok: false }
    );
    assert.deepEqual(keys(s), ["500:1", "500:2"]);
  });

  test("only hides the tab in its own profile", () => {
    const s = reduce(initialTabState<T>(), loaded([tab(1, "a", "500"), tab(1, "b", "600")]), {
      type: "closeStarted",
      key: "500:1",
    });
    assert.deepEqual(keys(s), ["600:1"]);
  });
});

describe("a full load racing a close", () => {
  test("doesn't bring back a tab closed while the load was in flight", () => {
    let s = reduce(initialTabState<T>(), loaded([tab(1), tab(2)]));
    const loadStartedAt = s.version;
    s = reduce(s, { type: "closeStarted", key: "500:1" }, { type: "closeSettled", key: "500:1", ok: true });
    s = reduce(s, loaded([tab(1), tab(2)], loadStartedAt));
    assert.deepEqual(keys(s), ["500:2"]);
  });

  test("shows a tab again if a later load still finds it (it wasn't really closed)", () => {
    let s = reduce(initialTabState<T>(), loaded([tab(1), tab(2)]));
    s = reduce(s, { type: "closeStarted", key: "500:1" }, { type: "closeSettled", key: "500:1", ok: true });
    s = reduce(s, loaded([tab(2)], s.version));
    s = reduce(s, loaded([tab(1), tab(2)], s.version));
    assert.deepEqual(keys(s), ["500:1", "500:2"]);
  });
});

describe("the record of closed tabs", () => {
  test("is pruned by an accepted refresh, so it doesn't grow over a long session", () => {
    let s = reduce(initialTabState<T>(), loaded([tab(1), tab(2), tab(3)]));
    for (const id of [1, 2]) {
      s = reduce(s, { type: "closeStarted", key: `500:${id}` }, { type: "closeSettled", key: `500:${id}`, ok: true });
    }
    assert.equal(s.closed.length, 2);
    s = reduce(s, { type: "refreshed", tabs: [tab(3)], startedAt: s.version });
    assert.deepEqual(s.closed, []);
  });

  test("an unchanged refresh with nothing to prune still returns the same state", () => {
    const s = reduce(initialTabState<T>(), loaded([tab(1)]));
    assert.equal(tabReducer(s, { type: "refreshed", tabs: [tab(1)], startedAt: s.version }, changed), s);
  });
});

describe("while the error view is shown", () => {
  test("failed refreshes don't trigger reload after reload", () => {
    let s = reduce(initialTabState<T>(), { type: "loadFailed", error: new Error("Firefox is not connected") });
    for (let i = 0; i < MAX_FAILED_REFRESHES + 2; i++) s = reduce(s, { type: "refreshFailed", startedAt: s.version });
    assert.equal(needsFullLoad(s), false);
  });
});

describe("waitForHosts", () => {
  test("returns at once when hosts are there", async () => {
    let sleeps = 0;
    const hosts = await waitForHosts(() => [1], 5000, { sleep: async () => void sleeps++ });
    assert.deepEqual(hosts, [1]);
    assert.equal(sleeps, 0);
  });

  test("waits for hosts that are restarting", async () => {
    const answers = [[], [], [7]];
    const hosts = await waitForHosts(() => answers.shift() ?? [7], 5000, { pollMs: 250, sleep: async () => {} });
    assert.deepEqual(hosts, [7]);
  });

  test("gives up after the timeout", async () => {
    let sleeps = 0;
    const hosts = await waitForHosts(() => [], 1000, { pollMs: 250, sleep: async () => void sleeps++ });
    assert.deepEqual(hosts, []);
    assert.equal(sleeps, 4);
  });
});
