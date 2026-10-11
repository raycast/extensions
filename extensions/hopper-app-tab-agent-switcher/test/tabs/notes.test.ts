import { test } from "node:test";
import assert from "node:assert/strict";
import { TabGoneError } from "../../src/lib/tabs/model.ts";
import { notes } from "../../src/lib/tabs/sources/notes.ts";
import { app, fakePlatform } from "../fake-platform.ts";

const notesApp = app("com.apple.Notes", "Notes");
const item = (title: string, identifier = "showRecentNote:") => ({ identifier, title, enabled: false });
const menu = [
  item("Eye strain"),
  item("New Note"),
  item("Apple"),
  item("New Note"),
  item("Clear Menu", "clearRecentNotes:"),
];

test("Notes: recent notes in menu order, the first open, same names told apart", async () => {
  const tabs = await notes.list(notesApp, fakePlatform({ menuItems: async () => menu }));
  assert.deepEqual(
    tabs.map((t) => [t.key, t.title, t.active, t.ref]),
    [
      ["com.apple.Notes:note:Eye strain:0", "Eye strain", true, { name: "Eye strain", index: 0 }],
      ["com.apple.Notes:note:New Note:0", "New Note", false, { name: "New Note", index: 1 }],
      ["com.apple.Notes:note:Apple:0", "Apple", false, { name: "Apple", index: 2 }],
      ["com.apple.Notes:note:New Note:1", "New Note", false, { name: "New Note", index: 3 }],
    ],
  );
});

test("Notes: an empty Recent Notes lists its windows, and only a missing menu is reported", async () => {
  const window = { index: 1, title: "All iCloud", minimized: false, tabs: [] };
  const windows = async () => [{ bundleId: "com.apple.Notes", windows: [window] }];
  const cleared = fakePlatform({ menuItems: async () => [item("Clear Menu", "clearRecentNotes:")], windows });
  assert.deepEqual(
    (await notes.list(notesApp, cleared)).map((t) => [t.source, t.title]),
    [["windows", "All iCloud"]],
  );
  assert.equal(cleared.reports.length, 0);

  const missing = fakePlatform({ menuItems: async () => [], windows });
  await notes.list(notesApp, missing);
  assert.deepEqual(
    missing.reports.map((r) => r.context),
    ["tabs: notes"],
  );
});

test("Notes: a unique name is shown by AppleScript", async () => {
  const platform = fakePlatform({ menuItems: async () => menu, runAppleScript: async () => "ok" });
  const [, , apple] = await notes.list(notesApp, platform);
  await notes.select(apple, platform);
  assert.match(platform.scripts[0], /notes whose name is "Apple"/);
});

test("Notes: a repeated name presses its menu item by position, reopening Notes' window if needed", async () => {
  const presses: unknown[][] = [];
  const opened: string[] = [];
  const platform = fakePlatform({
    menuItems: async () => menu,
    runAppleScript: async () => "2",
    pressMenuItem: async (...args) => presses.push(args) > 1,
    openUrl: async (url) => {
      opened.push(url);
    },
  });
  const tabs = await notes.list(notesApp, platform);
  await notes.select(tabs[3], platform);
  assert.deepEqual(presses, [
    ["com.apple.Notes", "showRecentNote:", "New Note", 3],
    ["com.apple.Notes", "showRecentNote:", "New Note", 3],
  ]);
  assert.deepEqual(opened, ["/Applications/Notes.app"]);
});

test("Notes: a note gone from AppleScript and the menu is gone", async () => {
  const platform = fakePlatform({
    menuItems: async () => menu,
    runAppleScript: async () => "0",
    pressMenuItem: async () => false,
    openUrl: async () => {},
  });
  const [tab] = await notes.list(notesApp, platform);
  await assert.rejects(notes.select(tab, platform), TabGoneError);
});
