import assert from "node:assert/strict";
import test from "node:test";

import {
  bookmarksFileFor,
  getSearchBookmarks,
  getSearchFolders,
  getSearchGroupFolders,
  getSearchGroupTabs,
  getSearchPins,
  getSearchProfiles,
  pinKeysFor,
  profileToRead,
  SEARCH_PERSONAL_PROFILE,
  sessionFileFor,
  spacesOfProfile,
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

const OTHER = "11111111-2222-3333-4444-555555555555";

test("no profiles file means there is nothing to choose", () => {
  assert.deepEqual(getSearchProfiles(undefined), []);
  assert.deepEqual(getSearchProfiles([]), []);
});

test("Personal comes first, under the name it was given", () => {
  assert.deepEqual(
    getSearchProfiles([
      { id: OTHER, name: "Work" },
      { id: SEARCH_PERSONAL_PROFILE, name: "Home" },
    ]),
    [
      { path: SEARCH_PERSONAL_PROFILE, name: "Home" },
      { path: OTHER, name: "Work" },
    ],
  );
});

test("Personal keeps the files that were there before profiles", () => {
  assert.equal(bookmarksFileFor(SEARCH_PERSONAL_PROFILE), "bookmarks.json");
  assert.equal(bookmarksFileFor(OTHER), `bookmarks-${OTHER}.json`);
  assert.deepEqual(pinKeysFor(SEARCH_PERSONAL_PROFILE, ["s1"]), ["shared", "s1"]);
  assert.deepEqual(pinKeysFor(OTHER, ["s2"]), [`shared:${OTHER}`, "s2"]);
});

test("a space with no profile of its own is Personal's", () => {
  const spaces = [{ id: "s1" }, { id: "s2", profile: OTHER }, { id: "s3", profile: SEARCH_PERSONAL_PROFILE }];

  assert.deepEqual(spacesOfProfile(spaces, SEARCH_PERSONAL_PROFILE), ["s1", "s3"]);
  assert.deepEqual(spacesOfProfile(spaces, OTHER), ["s2"]);
});

test("the first space kept the session file name it had before spaces", () => {
  assert.equal(sessionFileFor("00000000-0000-0000-0000-000000000001"), "session.json");
  assert.equal(sessionFileFor("s2"), "session-s2.json");
});

test("with several profiles, only the chosen one's pins are read", () => {
  const file = {
    shared: [{ id: "a", home: "https://personal.example/", title: "Personal" }],
    [`shared:${OTHER}`]: [{ id: "b", home: "https://work.example/", title: "Work" }],
    S1: [{ id: "c", home: "https://space.example/", title: "Space" }],
  };

  assert.deepEqual(
    getSearchPins(file, pinKeysFor(OTHER, ["s1"])).map(({ title }) => title),
    ["Work", "Space"],
  );
  assert.deepEqual(
    getSearchPins(file, pinKeysFor(SEARCH_PERSONAL_PROFILE, [])).map(({ title }) => title),
    ["Personal"],
  );
  assert.equal(getSearchPins(file).length, 3);
});

test("a profile deleted in Search falls back to Personal", () => {
  const saved = [
    { path: SEARCH_PERSONAL_PROFILE, name: "Personal" },
    { path: OTHER, name: "Work" },
  ];

  assert.equal(profileToRead(saved, OTHER), OTHER);
  assert.equal(profileToRead(saved, OTHER.toLowerCase()), OTHER.toLowerCase());
  assert.equal(profileToRead(saved, "77777777-8888-9999-0000-111111111111"), SEARCH_PERSONAL_PROFILE);
  assert.equal(profileToRead(saved, ""), SEARCH_PERSONAL_PROFILE);
  assert.equal(profileToRead([], OTHER), SEARCH_PERSONAL_PROFILE);
});
