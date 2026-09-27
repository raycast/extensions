import { test } from "node:test";
import assert from "node:assert/strict";
import { FIELD as F, RECORD as R } from "../../src/lib/tabs/applescript.ts";
import { describeError, loadTabs, orderTabs, selectTab } from "../../src/lib/tabs/load.ts";
import type { Tab } from "../../src/lib/tabs/model.ts";
import { sourceFor } from "../../src/lib/tabs/registry.ts";
import { app, fakePlatform } from "./fake-platform.ts";

const chrome = app("com.google.Chrome", "Google Chrome");
const safari = app("com.apple.Safari", "Safari");
const finder = app("com.apple.finder", "Finder");
const notes = app("com.apple.Notes", "Notes");

test("apps without a source fall back to windows", () => {
  assert.equal(sourceFor(chrome).id, "chromium");
  assert.equal(sourceFor(app("com.brave.Browser")).id, "chromium");
  assert.equal(sourceFor(finder).id, "windows");
});

test("loads every app, batching windows into one call; a failing app doesn't hide the others", async () => {
  let windowCalls = 0;
  const platform = fakePlatform({
    runAppleScript: async (script) => {
      if (script.includes("com.apple.Safari"))
        throw new Error("execution error: Not authorized to send Apple events to Safari. (-1743)");
      return `1${F}GitHub${F}https://github.com${F}true${R}`;
    },
    windows: async (ids) => {
      windowCalls++;
      return ids.map((bundleId) => ({
        bundleId,
        windows: [{ index: 1, title: bundleId, minimized: false, tabs: [] }],
      }));
    },
  });
  const result = await loadTabs([finder, chrome, safari, notes], platform);
  assert.equal(windowCalls, 1);
  assert.deepEqual(
    result.tabs.map((t) => t.app.name),
    ["Finder", "Google Chrome", "Notes"],
  );
  assert.deepEqual(result.failures, [
    { app: safari, message: "Raycast isn't allowed to control this app (Automation)" },
  ]);
  assert.equal(result.accessibility, true);
});

test("selection is routed to the tab's source", async () => {
  const platform = fakePlatform({ raiseWindow: async () => true });
  const [tab] = (
    await loadTabs(
      [finder],
      fakePlatform({
        windows: async () => [
          { bundleId: finder.bundleId, windows: [{ index: 1, title: "Recents", minimized: false, tabs: [] }] },
        ],
      }),
    )
  ).tabs;
  await selectTab(tab, platform);
  await assert.rejects(selectTab({ ...tab, source: "nope" }, platform), /Unknown tab source/);
});

const tab = (bundleId: string, key: string, active = false) =>
  ({ key, app: app(bundleId), source: "s", kind: "tab", title: key, active, ref: {} }) as Tab;

test("orders apps by recency, active tabs first, then the app's order; duplicate keys dropped", () => {
  const tabs = [
    tab("chrome", "a"),
    tab("chrome", "b", true),
    tab("ghostty", "t"),
    tab("chrome", "a"),
    tab("other", "z"),
  ];
  assert.deepEqual(
    orderTabs(tabs, ["ghostty", "chrome"]).map((t) => t.key),
    ["t", "b", "a", "z"],
  );
});

test("describes common failures", () => {
  assert.equal(describeError(new Error("Command timed out after 4000ms")), "The app didn't respond in time");
  assert.equal(describeError("boom\nstack"), "boom");
});
