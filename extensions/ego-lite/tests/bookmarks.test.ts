import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { filterBookmarks, flattenBookmarks, loadBookmarks } from "../src/lib/bookmarks";

const raw = {
  roots: {
    bookmark_bar: {
      type: "folder",
      name: "Bookmarks Bar",
      children: [
        {
          type: "folder",
          name: "Work",
          children: [{ type: "url", id: "7", name: "Raycast", url: "https://raycast.com" }],
        },
      ],
    },
  },
};

test("flattens nested bookmarks with folder paths", () => {
  assert.deepEqual(flattenBookmarks(raw), [
    { id: "7", title: "Raycast", url: "https://raycast.com", path: "Bookmarks Bar › Work" },
  ]);
});

test("matches title, URL, and path case-insensitively", () => {
  const items = flattenBookmarks(raw);
  assert.equal(filterBookmarks(items, "RAYCAST").length, 1);
  assert.equal(filterBookmarks(items, "raycast.com").length, 1);
  assert.equal(filterBookmarks(items, "work").length, 1);
});

test("falls back to Bookmarks when AccountBookmarks has no URL entries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ego-bookmarks-"));
  const account = join(dir, "AccountBookmarks");
  const legacy = join(dir, "Bookmarks");
  await writeFile(account, JSON.stringify({ roots: {} }));
  await writeFile(legacy, JSON.stringify(raw));

  assert.equal((await loadBookmarks({ account, legacy })).length, 1);
});

test("returns an empty list when neither bookmark file is readable", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ego-bookmarks-missing-"));

  assert.deepEqual(
    await loadBookmarks({ account: join(dir, "AccountBookmarks"), legacy: join(dir, "Bookmarks") }),
    [],
  );
});
