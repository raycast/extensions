import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSources } from "./helpers.mjs";

const { readSnapshotPage } = loadSources()("pagination");

test("bookmark insertions and deletions between pages never skip or duplicate snapshot rows", async () => {
  const bookmarks = Array.from({ length: 251 }, (_, id) => ({ id }));
  const expected = bookmarks.map((bookmark) => bookmark.id);
  let reads = 0;
  const load = async () => {
    reads++;
    return bookmarks;
  };
  const first = await readSnapshotPage(0, undefined, load, 100);
  bookmarks.splice(0, 3);
  bookmarks.unshift({ id: 900 }, { id: 901 });
  const second = await readSnapshotPage(1, first.cursor, load, 100);
  bookmarks.splice(100, 8);
  bookmarks.unshift({ id: 902 });
  const third = await readSnapshotPage(2, second.cursor, load, 100);
  const ids = [...first.data, ...second.data, ...third.data].map((bookmark) => bookmark.id);
  assert.deepEqual(ids, expected);
  assert.equal(new Set(ids).size, expected.length);
  assert.equal(reads, 1);
  assert.equal(first.hasMore, true);
  assert.equal(second.hasMore, true);
  assert.equal(third.hasMore, false);
});

test("a new search or refresh replaces the previous snapshot on page zero", async () => {
  let bookmarks = ["old", "remaining"];
  const load = async () => bookmarks;
  const first = await readSnapshotPage(0, undefined, load, 1);
  bookmarks = ["new", "remaining", "added"];
  const refreshed = await readSnapshotPage(0, first.cursor, load, 1);
  const next = await readSnapshotPage(1, refreshed.cursor, load, 1);
  assert.deepEqual(refreshed.data, ["new"]);
  assert.deepEqual(refreshed.cursor, bookmarks);
  assert.deepEqual(next.data, ["remaining"]);
  assert.notStrictEqual(refreshed.cursor, first.cursor);
});

test("empty and exhausted pages preserve their snapshot without rereading", async () => {
  let reads = 0;
  const load = async () => {
    reads++;
    return [];
  };
  const first = await readSnapshotPage(0, undefined, load, 100);
  const next = await readSnapshotPage(1, first.cursor, load, 100);
  assert.deepEqual(first.data, []);
  assert.equal(first.hasMore, false);
  assert.deepEqual(next.data, []);
  assert.equal(next.hasMore, false);
  assert.equal(reads, 1);
});

test("a missing later-page cursor fails instead of silently reading a different snapshot", async () => {
  let read = false;
  await assert.rejects(
    readSnapshotPage(
      1,
      undefined,
      async () => {
        read = true;
        return ["new"];
      },
      100,
    ),
    /snapshot is unavailable/,
  );
  assert.equal(read, false);
});
