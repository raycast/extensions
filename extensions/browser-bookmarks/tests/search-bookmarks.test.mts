import assert from "node:assert/strict";
import test from "node:test";

import {
  getSearchBookmarks,
  getSearchFolders,
  getSearchGroupFolders,
  getSearchGroupTabs,
  getSearchPins,
} from "../src/utils/searchBookmarks.ts";

const tree = [
  {
    id: "root",
    title: "Imported From Chrome",
    children: [
      {
        id: "bar",
        title: "Bookmarks Bar",
        children: [
          { id: "one", title: "YouTube", url: "https://youtube.com/" },
          { id: "two", title: "   ", url: "https://example.com/quiet" },
          {
            id: "dev",
            title: "Dev",
            children: [{ id: "three", title: "GitHub", url: "https://github.com/" }],
          },
        ],
      },
    ],
  },
];

test("reads a bookmark with the path of the folders above it", () => {
  const bookmarks = getSearchBookmarks(tree);

  assert.deepEqual(
    bookmarks.map(({ title, folder }) => ({ title, folder })),
    [
      { title: "YouTube", folder: "Imported From Chrome/Bookmarks Bar" },
      { title: "https://example.com/quiet", folder: "Imported From Chrome/Bookmarks Bar" },
      { title: "GitHub", folder: "Imported From Chrome/Bookmarks Bar/Dev" },
    ],
  );
});

test("a bookmark whose title was emptied reads as its address", () => {
  const quiet = getSearchBookmarks(tree).find((bookmark) => bookmark.id === "two");

  assert.equal(quiet?.title, "https://example.com/quiet");
});

test("lists every folder once, by its path, and no bookmark among them", () => {
  const folders = getSearchFolders(tree);

  assert.deepEqual(folders, [
    { id: "root", title: "Imported From Chrome" },
    { id: "bar", title: "Imported From Chrome/Bookmarks Bar" },
    { id: "dev", title: "Imported From Chrome/Bookmarks Bar/Dev" },
  ]);
});

test("an empty folder brings no bookmark, and no bookmarks at all is not an error", () => {
  assert.deepEqual(getSearchBookmarks([{ id: "empty", title: "Empty", children: [] }]), []);
  assert.deepEqual(getSearchBookmarks([]), []);
  assert.deepEqual(getSearchFolders([]), []);
});

test("reads the pinned tabs, under one folder, without repeating a shared one", () => {
  const pins = getSearchPins({
    "00000000-0000-0000-0000-000000000001": [
      { id: "pin-one", home: "https://youtube.com", title: "YouTube" },
      { id: "pin-two", home: "https://github.com/", title: "raycast/extensions", name: "Raycast" },
    ],
    shared: [{ id: "pin-one", home: "https://youtube.com", title: "YouTube" }],
  });

  assert.deepEqual(pins, [
    { id: "pin-one", title: "YouTube", url: "https://youtube.com", folder: "Pinned" },
    { id: "pin-two", title: "Raycast", url: "https://github.com/", folder: "Pinned" },
  ]);
});

test("a pin renamed by hand reads as that name, and one with no title as its address", () => {
  const pins = getSearchPins({
    space: [
      { id: "named", home: "https://example.com/a", title: "Example", name: "  Mine  " },
      { id: "bare", home: "https://example.com/b", title: "   " },
    ],
  });

  assert.deepEqual(
    pins.map(({ title }) => title),
    ["Mine", "https://example.com/b"],
  );
});

test("no pins at all is not an error", () => {
  assert.deepEqual(getSearchPins({}), []);
});

const sessions = [
  {
    groups: [
      { id: "g-basics", name: "Basics" },
      { id: "g-sre", name: "SRE" },
    ],
    tabs: [
      { title: "YouTube", url: "https://youtube.com/", pin: "Y" },
      { title: "New chat - Claude", url: "https://claude.ai/new", groupID: "g-basics" },
      { title: "   ", url: "https://cilium.io/", groupID: "g-sre" },
      { title: "Gone", url: "https://example.com/gone", groupID: "g-removed" },
    ],
  },
  {
    groups: [{ id: "g-basics", name: "Basics" }],
    tabs: [{ title: "New chat - Claude", url: "https://claude.ai/new", groupID: "g-basics" }],
  },
];

test("takes the tabs of a group, under the group's name, and leaves the day's tabs out", () => {
  assert.deepEqual(getSearchGroupTabs(sessions), [
    { id: "g-basics:https://claude.ai/new", title: "New chat - Claude", url: "https://claude.ai/new", folder: "Basics" },
    { id: "g-sre:https://cilium.io/", title: "https://cilium.io/", url: "https://cilium.io/", folder: "SRE" },
  ]);
});

test("a group named by a tab but gone from the file brings nothing", () => {
  const orphan = getSearchGroupTabs(sessions).find((tab) => tab.url.includes("gone"));

  assert.equal(orphan, undefined);
});

test("every space's groups are listed once, however many spaces hold them", () => {
  assert.deepEqual(getSearchGroupFolders(sessions), [
    { id: "g-basics", title: "Basics" },
    { id: "g-sre", title: "SRE" },
  ]);
});

test("a session with no group at all is not an error", () => {
  assert.deepEqual(getSearchGroupTabs([{ tabs: [{ title: "Alone", url: "https://example.com/" }] }]), []);
  assert.deepEqual(getSearchGroupFolders([{}]), []);
});
