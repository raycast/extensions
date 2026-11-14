import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import type { BrowserWindow, BrowserConfig } from "../src/browsers/types";
import createLoader from "./load-ts.ts";

const session = "abcdef1234567890";
const companionWindow = (id = 1) => ({
  id,
  title: "Current page",
  tabs: [{ id: id + 10, title: "Current page", url: "https://example.com" }],
});
const unavailableWindow = (id = "155", title = "Zen Browser"): BrowserWindow => ({
  id,
  title,
  space: 1,
  tabs: [],
  tabListUnavailable: true,
});

function adapter(bridgeWindows: ReturnType<typeof companionWindow>[], axWindows: BrowserWindow[]) {
  const load = createLoader({
    "node:fs/promises": { readdir: async () => [`${session}.sock`] },
    "node:net": {
      createConnection: () => {
        const socket = Object.assign(new EventEmitter(), {
          setTimeout() {},
          destroy() {},
          write() {
            queueMicrotask(() => socket.emit("data", Buffer.from(JSON.stringify({ data: bridgeWindows }) + "\n")));
          },
        });
        queueMicrotask(() => socket.emit("connect"));
        return socket;
      },
    },
    "../helpers/browser-helper": { runBrowserHelper: async () => JSON.stringify(axWindows) },
  });
  return load("src/browsers/firefox.ts");
}

function nativeWindows(appName: string, windows: BrowserWindow[]) {
  return windows.map((window) => ({
    id: Number(window.id),
    pid: 123,
    app: appName,
    title: window.title,
    space: window.space,
    frame: { x: 0, y: 0, w: 800, h: 600 },
    "has-ax-reference": true,
  }));
}

for (const [appName, title] of [
  ["Firefox", "Mozilla Firefox"],
  ["Zen", "Zen Browser"],
]) {
  const browser: BrowserConfig = { id: appName.toLowerCase(), appName, engine: "firefox" };
  test(`${appName} shows one companion window when AX only exposes the browser name`, async () => {
    const axWindows = [unavailableWindow("155", title)];
    const firefox = adapter([companionWindow()], axWindows);
    const native = nativeWindows(appName, axWindows);
    const windows = await firefox.getFirefoxWindows(browser, native);
    assert.equal(windows.length, 1, "must not append a duplicate Tab list unavailable row");
    assert.equal(windows[0].tabListUnavailable, false);
    assert.equal(windows[0].id, `${session}:1`, "focus must keep using the companion session");
    assert.equal(windows[0].nativeWindowId, "155");
    assert.equal(windows[0].tabs[0].id, `${session}:11`);
    assert.equal(windows[0].space, 1);
    assert.deepEqual(await firefox.getFirefoxSummary(browser, native), { windows: 1, tabs: 1 });
  });
}

test("multiple unavailable native windows stay visible when companion coverage is unknown", async () => {
  const axWindows = [unavailableWindow(), unavailableWindow("156")];
  const windows = await adapter([companionWindow()], axWindows).getFirefoxWindows(
    { appName: "Zen" },
    nativeWindows("Zen", axWindows),
  );
  assert.equal(windows.length, 3);
  assert.equal(windows.filter((window: BrowserWindow) => window.tabListUnavailable).length, 2);
});

test("multiple companion windows are not assigned one native window by position", async () => {
  const axWindows = [unavailableWindow()];
  const windows = await adapter([companionWindow(), companionWindow(2)], axWindows).getFirefoxWindows(
    { appName: "Zen" },
    nativeWindows("Zen", axWindows),
  );
  assert.equal(windows.length, 3);
});

test("a readable AX window with different tabs is not merged by window count", async () => {
  const axWindows = [
    { ...unavailableWindow(), tabListUnavailable: false, tabs: [{ id: "native-tab", title: "Other page", url: "" }] },
  ];
  const windows = await adapter([companionWindow()], axWindows).getFirefoxWindows(
    { appName: "Zen" },
    nativeWindows("Zen", axWindows),
  );
  assert.equal(windows.length, 2);
});

test("unique title matches still reconcile individual windows in a multi-window browser", async () => {
  const axWindows = [unavailableWindow("155", "Current page"), unavailableWindow("156", "Private page")];
  const windows = await adapter([companionWindow()], axWindows).getFirefoxWindows(
    { appName: "Zen" },
    nativeWindows("Zen", axWindows),
  );
  assert.equal(windows.length, 2);
  assert.equal(windows[0].id, `${session}:1`);
  assert.equal(windows[0].nativeWindowId, "155");
  assert.equal(windows[0].space, 1);
  assert.equal(windows[1].id, "156");
  assert.equal(windows[1].tabListUnavailable, true);
});

for (const appName of ["Firefox", "Zen"]) {
  test(`${appName} reconciles same-title windows by available URLs without duplicate search rows`, async () => {
    const bridge = [companionWindow(1), companionWindow(2)].map((window, index) => ({
      ...window,
      tabs: [{ ...window.tabs[0], url: `https://example.org/#window-${index}` }],
    }));
    // Reverse native order: positional matching would assign the wrong Space and native identity.
    const axWindows = [1, 0].map((index) => ({
      id: String(155 + index),
      title: "Current page",
      space: index + 1,
      tabs: [{ id: `native-${index}`, title: "Current page", url: `example.org/#window-${index}` }],
    }));
    const firefox = adapter(bridge, axWindows);
    const native = nativeWindows(appName, axWindows);
    const windows = await firefox.getFirefoxWindows({ appName }, native);
    assert.equal(windows.length, 2, "AX fallbacks must not duplicate the two companion windows");
    assert.deepEqual(
      windows.map((window: BrowserWindow) => [window.id, window.nativeWindowId, window.space, window.tabs[0].id]),
      [
        [`${session}:1`, "155", 1, `${session}:11`],
        [`${session}:2`, "156", 2, `${session}:12`],
      ],
    );
    assert.deepEqual(await firefox.getFirefoxSummary({ appName }, native), { windows: 2, tabs: undefined });
  });
}

test("ambiguous same-title windows with no URL evidence remain separate", async () => {
  const axWindows = [155, 156].map((id) => ({
    id: String(id),
    title: "Current page",
    space: id - 154,
    tabs: [{ id: `native-${id}`, title: "Current page", url: "" }],
  }));
  const windows = await adapter([companionWindow(1), companionWindow(2)], axWindows).getFirefoxWindows(
    { appName: "Firefox" },
    nativeWindows("Firefox", axWindows),
  );
  assert.equal(windows.length, 4);
  assert(windows.slice(0, 2).every((window: BrowserWindow) => window.nativeWindowId === undefined));
});

test("conflicting known URLs do not merge even when the title is unique", async () => {
  for (const url of ["http://example.com/", "https://example.com/#other", "https://example.com/?other=1"]) {
    const axWindows = [
      {
        id: "155",
        title: "Current page",
        tabs: [{ id: "native-tab", title: "Current page", url }],
      },
    ];
    const windows = await adapter([companionWindow()], axWindows).getFirefoxWindows(
      { appName: "Firefox" },
      nativeWindows("Firefox", axWindows),
    );
    assert.equal(windows.length, 2, `must retain the native window for ${url}`);
  }
});

test("schemeless addresses with absolute URLs in queries and fragments reconcile without duplicates", async () => {
  for (const appName of ["Firefox", "Zen"]) {
    for (const address of [
      "example.com/?next=https://other.com/",
      "example.com/#https://other.com/",
      "example.com:8443/?next=https://other.com/",
    ]) {
      const bridge = [{ ...companionWindow(), tabs: [{ id: 11, title: "Current page", url: `https://${address}` }] }];
      const axWindows = [
        {
          id: "155",
          title: "Current page",
          space: 3,
          tabs: [{ id: "native-tab", title: "Current page", url: address }],
        },
      ];
      const firefox = adapter(bridge, axWindows);
      const browser = { appName };
      const native = nativeWindows(appName, axWindows);
      const windows = await firefox.getFirefoxWindows(browser, native);
      assert.equal(windows.length, 1, `${appName}: ${address} must not duplicate the window`);
      assert.equal(windows[0].nativeWindowId, "155");
      assert.equal(windows[0].space, 3);
      assert.deepEqual(await firefox.getFirefoxSummary(browser, native), { windows: 1, tabs: 1 });
    }
  }
});

test("multiple native windows cannot claim the same companion URL", async () => {
  const axWindows = [155, 156].map((id) => ({
    id: String(id),
    title: "Current page",
    tabs: [{ id: `native-${id}`, title: "Current page", url: "https://example.com/" }],
  }));
  const windows = await adapter([companionWindow()], axWindows).getFirefoxWindows(
    { appName: "Firefox" },
    nativeWindows("Firefox", axWindows),
  );
  assert.equal(windows.length, 3, "URL evidence must also be unique on the native side");
});

test("partial URL evidence matches duplicate tab titles without reusing a companion tab", async () => {
  const bridge = [
    {
      ...companionWindow(),
      tabs: [
        { id: 11, title: "Current page", url: "https://example.com/#a" },
        { id: 12, title: "Current page", url: "https://example.com/#b" },
      ],
    },
  ];
  const axWindows = [
    {
      id: "155",
      title: "Current page",
      space: 3,
      tabs: [
        { id: "native-a", title: "Current page", url: "example.com/#a" },
        { id: "native-b", title: "Current page", url: "" },
      ],
    },
  ];
  const windows = await adapter(bridge, axWindows).getFirefoxWindows(
    { appName: "Firefox" },
    nativeWindows("Firefox", axWindows),
  );
  assert.equal(windows.length, 1);
  assert.equal(windows[0].nativeWindowId, "155");
  assert.equal(windows[0].space, 3);
  axWindows[0].tabs[1].url = "example.com/#a";
  const conflict = await adapter(bridge, axWindows).getFirefoxWindows(
    { appName: "Firefox" },
    nativeWindows("Firefox", axWindows),
  );
  assert.equal(conflict.length, 2, "two native tabs cannot reuse the same companion tab as URL evidence");
});
