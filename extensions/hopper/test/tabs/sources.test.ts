import { test } from "node:test";
import assert from "node:assert/strict";
import { FIELD as F, RECORD as R } from "../../src/lib/tabs/applescript.ts";
import * as chromium from "../../src/lib/tabs/sources/chromium.ts";
import * as cmux from "../../src/lib/tabs/sources/cmux.ts";
import * as iterm from "../../src/lib/tabs/sources/iterm.ts";
import * as safari from "../../src/lib/tabs/sources/safari.ts";
import * as terminal from "../../src/lib/tabs/sources/terminal.ts";
import { app, fakePlatform } from "../fake-platform.ts";

const chrome = app("com.google.Chrome", "Google Chrome");

test("Chromium: tab ids, active tab, untitled tabs fall back to the URL", () => {
  const tabs = chromium.parse(
    chrome,
    `11${F}GitHub${F}https://github.com${F}false${R}12${F}${F}about:blank${F}true${R}`,
  );
  assert.deepEqual(
    tabs.map((t) => [t.key, t.source, t.title, t.url, t.active, t.ref]),
    [
      ["com.google.Chrome:11", "chromium", "GitHub", "https://github.com", false, { tabId: "11" }],
      ["com.google.Chrome:12", "chromium", "about:blank", "about:blank", true, { tabId: "12" }],
    ],
  );
});

test("Chromium: selecting looks the tab up by id", async () => {
  const platform = fakePlatform({ runAppleScript: async () => "ok" });
  const [tab] = chromium.parse(chrome, `42${F}t${F}u${F}true${R}`);
  await chromium.chromium.select(tab, platform);
  assert.match(platform.scripts[0], /is "42" then/);
});

test("Safari: remembers window, position, and URL", () => {
  const [tab] = safari.parse(app("com.apple.Safari"), `7${F}2${F}Apple${F}https://apple.com${F}true${R}`);
  assert.deepEqual(tab.ref, { windowId: "7", index: 2, url: "https://apple.com" });
  assert.equal(tab.active, true);
});

test("cmux: workspaces with the working directory as detail", () => {
  const [tab] = cmux.parse(
    app("com.cmuxterm.app"),
    `W1${F}T1${F}hopper${F}true${F}/Users/matt/Projects/hopper${F}P1${R}`,
  );
  assert.deepEqual(
    [tab.kind, tab.title, tab.detail, tab.ref],
    ["workspace", "hopper", "~/Projects/hopper", { windowId: "W1", tabId: "T1" }],
  );
});

test("iTerm: one entry per tab, keyed by session", () => {
  const [tab] = iterm.parse(app("com.googlecode.iterm2"), `1${F}S-1${F}zsh${F}true${R}`);
  assert.deepEqual([tab.key, tab.title, tab.active], ["com.googlecode.iterm2:S-1", "zsh", true]);
});

test("Terminal: custom title, else the foreground process", () => {
  const tabs = terminal.parse(
    app("com.apple.Terminal"),
    `5${F}${F}/dev/ttys001${F}true${F}login, -zsh, vim${R}5${F}logs${F}/dev/ttys002${F}false${F}zsh${R}`,
  );
  assert.deepEqual(
    tabs.map((t) => [t.title, t.ref]),
    [
      ["vim", { windowId: "5", tty: "/dev/ttys001" }],
      ["logs", { windowId: "5", tty: "/dev/ttys002" }],
    ],
  );
});

test("Chromium: the list script skips incognito windows", async () => {
  const platform = fakePlatform({ runAppleScript: async () => "" });
  await chromium.chromium.list(app("com.google.Chrome"), platform);
  assert.match(platform.scripts[0], /if winMode is not "incognito" then/);
});

const win = (index: number, title: string) => ({ index, title, minimized: false, tabs: [] });
const safariApp = app("com.apple.Safari", "Safari");
const rec = (wid: string, i: number, title: string, wname: string) =>
  `${wid}${F}${i}${F}${title}${F}https://${title}.com${F}${i === 1}${F}${wname}${R}`;

test("Safari: private windows are left out, matched by title in front-to-back order", async () => {
  const out =
    rec("1", 1, "Bank", "Bank") +
    rec("2", 1, "News", "News") +
    rec("2", 2, "Mail", "News") +
    rec("3", 1, "Bank", "Bank");
  const platform = fakePlatform({
    runAppleScript: async () => out,
    windows: async () => [
      {
        bundleId: safariApp.bundleId,
        windows: [win(1, "Bank, Private Browsing"), win(2, "News"), win(3, "Bank")],
      },
    ],
  });
  const tabs = await safari.safari.list(safariApp, platform);
  assert.deepEqual(
    tabs.map((t) => [t.ref.windowId, t.title]),
    [
      ["2", "News"],
      ["2", "Mail"],
      ["3", "Bank"],
    ],
  );
});

test("Safari: fails closed when a private window can't be placed, or Accessibility sees nothing", () => {
  const script = [
    { id: "1", name: "Renamed" },
    { id: "2", name: "News" },
  ];
  assert.deepEqual([...safari.privateWindowIds(script, [win(1, "Other, Private Browsing"), win(2, "News")])], ["1"]);
  assert.deepEqual([...safari.privateWindowIds(script, [win(1, "Other"), win(2, "News")])], []);
  assert.deepEqual([...safari.privateWindowIds(script, [])], ["1", "2"]);
  assert.deepEqual([...safari.privateWindowIds([], [])], []);
});

test("cmux: a workspace with several terminals lists each by name; terminals are panes with their tty", () => {
  const panels = cmux.parsePanels(
    JSON.stringify({
      windows: [
        {
          tabManager: {
            workspaces: [
              {
                panels: [
                  { id: "P1", ttyName: "ttys003", customTitle: "fix-bug-1", title: "zsh" },
                  { id: "P2", ttyName: "ttys020", title: "fix-bug-2" },
                ],
              },
            ],
          },
        },
      ],
    }),
  );
  const tabs = cmux.parse(app("com.cmuxterm.app"), `W1${F}T1${F}fix-bug${F}true${F}/p${F}P1,P2${F}P2${R}`, panels);
  assert.deepEqual(
    tabs.map((t) => [t.key, t.kind, t.title, t.detail, t.active, t.ref.terminalId, t.panes]),
    [
      ["com.cmuxterm.app:T1", "workspace", "fix-bug", "/p", false, undefined, undefined],
      ["com.cmuxterm.app:T1:P1", "tab", "fix-bug-1", "fix-bug", false, "P1", [{ id: "P1", tty: "ttys003" }]],
      ["com.cmuxterm.app:T1:P2", "tab", "fix-bug-2", "fix-bug", true, "P2", [{ id: "P2", tty: "ttys020" }]],
    ],
  );
  assert.equal(cmux.parsePanels("{").size, 0);
});

test("cmux: selecting a terminal (or a pane) focuses it", async () => {
  const platform = fakePlatform({ runAppleScript: async () => "ok" });
  const tabs = cmux.parse(app("com.cmuxterm.app"), `W1${F}T1${F}fix-bug${F}true${F}/p${F}P1,P2${F}P1${R}`);
  await cmux.cmux.select(tabs[2], platform);
  assert.match(platform.scripts[0], /if \(id of term\) is "P2" then[\s\S]*focus term/);
});

test("iTerm: every split session is a pane with its tty", () => {
  const [tab] = iterm.parse(
    app("com.googlecode.iterm2"),
    `1${F}S-1${F}zsh${F}true${F}S-1=/dev/ttys004,S-2=/dev/ttys005,${R}`,
  );
  assert.deepEqual(tab.panes, [
    { id: "S-1", tty: "ttys004" },
    { id: "S-2", tty: "ttys005" },
  ]);
});

test("Terminal: each tab is one pane, by tty", () => {
  const [tab] = terminal.parse(app("com.apple.Terminal"), `5${F}${F}/dev/ttys001${F}true${F}zsh${R}`);
  assert.deepEqual(tab.panes, [{ id: "/dev/ttys001", tty: "ttys001" }]);
});
