import { test } from "node:test";
import assert from "node:assert/strict";
import { fromWindows, windows } from "../../src/lib/tabs/sources/windows.ts";
import { TabGoneError } from "../../src/lib/tabs/model.ts";
import { app, fakePlatform } from "../fake-platform.ts";

const ghostty = app("com.mitchellh.ghostty", "Ghostty");

test("a window with a native tab bar becomes one entry per tab; others one window entry", () => {
  const tabs = fromWindows(ghostty, [
    {
      index: 1,
      title: "~/a",
      minimized: false,
      tabs: [
        { title: "~/a", selected: true },
        { title: "~/b", selected: false },
      ],
    },
    { index: 2, title: "", minimized: true, tabs: [] },
  ]);
  assert.deepEqual(
    tabs.map((t) => [t.kind, t.title, t.active, t.detail]),
    [
      ["tab", "~/a", true, undefined],
      ["tab", "~/b", false, undefined],
      ["window", "Ghostty", false, "Minimized"],
    ],
  );
  assert.deepEqual(tabs[1].ref, { index: 1, title: "~/a", tab: "~/b", tabIndex: 1 });
});

test("only the front window's selected tab is active", () => {
  const tabs = fromWindows(ghostty, [
    { index: 1, title: "x", minimized: false, tabs: [] },
    {
      index: 2,
      title: "y",
      minimized: false,
      tabs: [
        { title: "p", selected: true },
        { title: "q", selected: false },
      ],
    },
  ]);
  assert.deepEqual(
    tabs.map((t) => t.active),
    [true, false, false],
  );
});

test("reads many apps in one call", async () => {
  let calls = 0;
  const platform = fakePlatform({
    windows: async (ids) => {
      calls++;
      return ids.map((bundleId) => ({
        bundleId,
        windows: [{ index: 1, title: bundleId, minimized: false, tabs: [] }],
      }));
    },
  });
  const tabs = await windows.listAll!([ghostty, app("com.apple.finder", "Finder")], platform);
  assert.equal(calls, 1);
  assert.deepEqual(
    tabs.map((t) => t.app.name),
    ["Ghostty", "Finder"],
  );
});

test("selecting passes the window's and native tab's positions, which tell same-titled ones apart", async () => {
  const calls: unknown[][] = [];
  const platform = fakePlatform({ raiseWindow: async (...args) => (calls.push(args), true) });
  const tabs = fromWindows(ghostty, [
    { index: 1, title: "zsh", minimized: false, tabs: [] },
    {
      index: 2,
      title: "zsh",
      minimized: false,
      tabs: [
        { title: "zsh", selected: true },
        { title: "zsh", selected: false },
      ],
    },
  ]);
  for (const tab of tabs) await windows.select(tab, platform);
  assert.deepEqual(calls, [
    ["com.mitchellh.ghostty", 1, "zsh", undefined],
    ["com.mitchellh.ghostty", 2, "zsh", { title: "zsh", index: 0 }],
    ["com.mitchellh.ghostty", 2, "zsh", { title: "zsh", index: 1 }],
  ]);
});

test("selecting a window that's gone throws TabGoneError", async () => {
  const [tab] = fromWindows(ghostty, [{ index: 1, title: "x", minimized: false, tabs: [] }]);
  await assert.rejects(windows.select(tab, fakePlatform({ raiseWindow: async () => false })), TabGoneError);
});

test("private-browsing windows of other browsers are skipped", () => {
  const firefox = app("org.mozilla.firefox", "Firefox");
  const tabs = fromWindows(firefox, [
    { index: 1, title: "Bank — Private Browsing", minimized: false, tabs: [] },
    { index: 2, title: "Docs — Mozilla Firefox", minimized: false, tabs: [] },
  ]);
  assert.deepEqual(
    tabs.map((t) => t.title),
    ["Docs — Mozilla Firefox"],
  );
});
