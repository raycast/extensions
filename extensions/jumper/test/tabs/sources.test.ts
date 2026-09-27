import { test } from "node:test";
import assert from "node:assert/strict";
import { FIELD as F, RECORD as R } from "../../src/lib/tabs/applescript.ts";
import * as chromium from "../../src/lib/tabs/sources/chromium.ts";
import * as cmux from "../../src/lib/tabs/sources/cmux.ts";
import * as iterm from "../../src/lib/tabs/sources/iterm.ts";
import * as safari from "../../src/lib/tabs/sources/safari.ts";
import * as terminal from "../../src/lib/tabs/sources/terminal.ts";
import { app, fakePlatform } from "./fake-platform.ts";

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
  const [tab] = cmux.parse(app("com.cmuxterm.app"), `W1${F}T1${F}jumper${F}true${F}/Users/matt/Projects/jumper${R}`);
  assert.deepEqual(
    [tab.kind, tab.title, tab.detail, tab.ref],
    ["workspace", "jumper", "~/Projects/jumper", { windowId: "W1", tabId: "T1" }],
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
