import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadMenuBarOverview,
  selectedMenuBarMetric,
  menuBarCacheKey,
  matchingMenuBarOverview,
} from "../src/lib/menu-bar";
import { loadOverview, sortedMetrics } from "../src/lib/dashboard-metrics";
import { demoOverview, formatMetric } from "../src/lib/revenuecat";

const signal = () => new AbortController().signal;
test("menu bar demo bypasses live API and uses the dashboard overview and currency", async () => {
  const live = async (): Promise<never> => {
    throw new Error("Live API must not be used");
  };
  const data = await loadMenuBarOverview(
    { projects: live, overview: live },
    { demo: true, currency: "EUR", selectedProjectId: "real-project" },
    signal(),
  );
  assert.equal(data.project.id, "demo_project");
  assert.equal(data.projects.length, 1);
  assert.deepEqual(data.overview, await loadOverview({ overview: live }, "demo_project", "EUR", true));
  assert.equal(selectedMenuBarMetric(data.overview.metrics)?.id, "mrr");
  assert.equal(data.overview.currency, "EUR");
});
test("menu bar uses the saved project, passes currency and abort signal, and falls back after access changes", async () => {
  const calls: string[] = [];
  const abort = signal();
  const client = {
    projects: async () => [
      { id: "first", name: "First" },
      { id: "second", name: "Second" },
    ],
    overview: async (id: string, currency: string, passedSignal?: AbortSignal) => {
      calls.push(id);
      assert.equal(currency, "SEK");
      assert.equal(passedSignal, abort);
      return { ...demoOverview, currency };
    },
  };
  const data = await loadMenuBarOverview(client, { demo: false, currency: "SEK", selectedProjectId: "second" }, abort);
  assert.equal(data.project.id, "second");
  await loadMenuBarOverview(client, { demo: false, currency: "SEK", selectedProjectId: "removed" }, abort);
  assert.deepEqual(calls, ["second", "first"]);
});
test("unavailable projects, auth failures, and cancellation never become fake metrics", async () => {
  const overview = async (): Promise<never> => {
    throw new Error("Should not load metrics");
  };
  await assert.rejects(
    loadMenuBarOverview({ projects: async () => [], overview }, { demo: false, currency: "USD" }, signal()),
    /No accessible projects/,
  );
  await assert.rejects(
    loadMenuBarOverview(
      {
        projects: async () => {
          throw new Error("Sign in again");
        },
        overview,
      },
      { demo: false, currency: "USD" },
      signal(),
    ),
    /Sign in again/,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    loadMenuBarOverview({ projects: async () => [], overview }, { demo: true, currency: "USD" }, controller.signal),
    { name: "AbortError" },
  );
});
test("selection preserves zero, does not substitute missing metrics, and shares dashboard ordering", () => {
  const metrics = [...demoOverview.metrics].reverse().map((metric) => ({ ...metric, value: 0 }));
  assert.equal(selectedMenuBarMetric(metrics, "active_trials")?.id, "active_trials");
  assert.equal(formatMetric(selectedMenuBarMetric(metrics, "active_trials")!, "USD"), "0");
  assert.equal(selectedMenuBarMetric(metrics, "missing"), undefined);
  assert.deepEqual(
    sortedMetrics(metrics).map((metric) => metric.id),
    demoOverview.metrics.map((metric) => metric.id),
  );
  assert.equal(metrics[0].id, "active_users");
});
test("dashboard and menu bar default to v3 and honor the extension-wide legacy setting", async () => {
  const versions: (boolean | undefined)[] = [];
  const client = {
    projects: async () => [{ id: "project", name: "Project" }],
    overview: async (_id: string, _currency: string, _signal?: AbortSignal, v3?: boolean) => {
      versions.push(v3);
      return demoOverview;
    },
  };
  await loadOverview(client, "project", "USD", false);
  await loadOverview(client, "project", "USD", false, undefined, false);
  await loadMenuBarOverview(client, { demo: false, currency: "USD" }, signal());
  await loadMenuBarOverview(client, { demo: false, currency: "USD", chartsV3: false }, signal());
  assert.deepEqual(versions, [true, false, true, false]);
});

test("failed project switches and command restarts never reuse another project's metrics", async () => {
  const cache = new Map<string, string>();
  const options = { demo: false, currency: "USD", chartsV3: true };
  const a = {
    projects: [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ],
    project: { id: "a", name: "A" },
    overview: demoOverview,
  };
  cache.set(menuBarCacheKey({ ...options, projectId: "a" }), JSON.stringify(a));
  const read = (projectId?: string) => {
    const raw = cache.get(menuBarCacheKey({ ...options, projectId }));
    return matchingMenuBarOverview(raw ? JSON.parse(raw) : undefined, projectId);
  };
  assert.equal(read("a")?.project.id, "a");
  assert.equal(read("b"), undefined);
  await assert.rejects(
    loadMenuBarOverview(
      {
        projects: async () => a.projects,
        overview: async () => {
          throw new Error("Offline");
        },
      },
      { ...options, selectedProjectId: "b" },
      signal(),
    ),
    /Offline/,
  );
  // A fresh command reads the same persisted cache after the failed switch.
  assert.equal(read("b"), undefined);
  assert.equal(read(undefined), undefined);
  assert.equal(matchingMenuBarOverview(a, "b"), undefined);
  assert.equal(matchingMenuBarOverview(null, "a"), undefined);
  // Switching back to A can show A immediately, including while offline.
  assert.equal(read("a")?.overview.metrics[0].value, demoOverview.metrics[0].value);
  const b = {
    ...a,
    project: { id: "b", name: "B" },
    overview: { ...demoOverview, metrics: demoOverview.metrics.map((m) => ({ ...m, value: 0 })) },
  };
  cache.set(menuBarCacheKey({ ...options, projectId: "b" }), JSON.stringify(b));
  // A late response for A only updates A's entry.
  cache.set(menuBarCacheKey({ ...options, projectId: "a" }), JSON.stringify(a));
  assert.equal(read("b")?.overview.metrics[0].value, 0);
  assert.equal(cache.has(menuBarCacheKey({ ...options, projectId: "a", chartsV3: false })), false);
  assert.equal(cache.has(menuBarCacheKey({ ...options, projectId: "a", demo: true })), false);
  assert.equal(cache.has(menuBarCacheKey({ ...options, projectId: "a", currency: "EUR" })), false);
});
