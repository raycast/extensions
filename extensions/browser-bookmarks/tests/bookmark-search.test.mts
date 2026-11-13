import assert from "node:assert/strict";
import test from "node:test";

import { createBookmarkSearch, getSearchFolder } from "../src/utils/bookmarkSearch.ts";

const bookmark = (title: string, folder: string, searchFolder?: string) => ({
  title,
  domain: "example.com",
  folder,
  searchFolder,
});

const search = (bookmarks: ReturnType<typeof bookmark>[], query: string, threshold: number) =>
  createBookmarkSearch(bookmarks, threshold)
    .search(query)
    .map((result) => result.item.title);

test("removes the root folder from the search folder", () => {
  assert.equal(getSearchFolder("Bookmarks Bar", "Bookmarks Bar"), "");
  assert.equal(getSearchFolder("Bookmarks Bar", "Bookmarks Bar/repos"), "repos");
  assert.equal(getSearchFolder("Bookmarks Bar", "Bookmarks Bar/personal/network"), "personal/network");
});

test("does not match the root folder name but still matches subfolders", () => {
  const bookmarks = [
    bookmark("zulu", "Bookmarks Bar", ""),
    bookmark("kilo", "Bookmarks Bar/repos", "repos"),
    bookmark("lima", "Bookmarks Bar/personal/network", "personal/network"),
  ];

  assert.deepEqual(search(bookmarks, "bar", 0.4), []);
  assert.deepEqual(search(bookmarks, "bookmarks", 0.4), []);
  assert.deepEqual(search(bookmarks, "repos", 0.4), ["kilo"]);
  assert.deepEqual(search(bookmarks, "network", 0.4), ["lima"]);
});

test("searches the full folder when there is no search folder", () => {
  const bookmarks = [bookmark("zulu", "Toolbar/work")];

  assert.deepEqual(search(bookmarks, "toolbar", 0.4), ["zulu"]);
});

test("stricter thresholds drop loose matches on short queries", () => {
  const bookmarks = [bookmark("gisce erp", ""), bookmark("repos", "")];

  assert.deepEqual(search(bookmarks, "erp", 0.4).sort(), ["gisce erp", "repos"]);
  assert.deepEqual(search(bookmarks, "erp", 0.3), ["gisce erp"]);
  assert.deepEqual(search(bookmarks, "erp", 0.2), ["gisce erp"]);
});

test("stricter thresholds still tolerate a typo on a long query", () => {
  const bookmarks = [bookmark("dashboard", "")];

  assert.deepEqual(search(bookmarks, "dashbaord", 0.4), ["dashboard"]);
  assert.deepEqual(search(bookmarks, "dashbaord", 0.3), ["dashboard"]);
});
