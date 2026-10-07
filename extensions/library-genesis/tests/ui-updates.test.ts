import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import type { BookEntry } from "../src/types";
import { type BookCover, MISSING_COVER, loadBookCovers } from "../src/utils/book-covers";
import { getBookRows } from "../src/utils/book-rows";

const book = (id: string): BookEntry => ({
  md5: id,
  infoUrl: `https://libgen.li/edition.php?id=${id}`,
  downloadUrl: `https://libgen.li/ads.php?md5=${id}`,
  coverUrl: `https://libgen.li/covers/${id}.jpg`,
  title: `Book ${id}`,
  author: "Author",
  language: "English",
  extension: "epub",
});

test("100 cached covers publish one complete update with no per-row loading updates", async () => {
  const urls = Array.from({ length: 100 }, (_, i) => `cover-${i}`);
  const batches: Record<string, BookCover>[] = [];
  let requests = 0;
  await loadBookCovers(
    [...urls, urls[0], "N/A"],
    async (url) => {
      requests++;
      return { path: `/cache/${url}.jpg`, width: 160, height: 240 };
    },
    (covers) => batches.push(covers),
  );
  assert.equal(requests, 100);
  assert.equal(batches.length, 1);
  assert.equal(Object.keys(batches[0]).length, 100);
  assert.ok(Object.values(batches[0]).every((cover) => cover.path && !cover.loading));
  await delay(110);
  assert.equal(batches.length, 1, "the final flush must remove the pending timer");
});

test("cover loading bounds concurrent work and publishes progress without mutating previous batches", async () => {
  const batches: Record<string, BookCover>[] = [];
  let active = 0;
  let maximum = 0;
  await loadBookCovers(
    Array.from({ length: 16 }, (_, i) => `cover-${i}`),
    async (url) => {
      maximum = Math.max(maximum, ++active);
      await delay(40);
      active--;
      return { path: url, width: 160, height: 240 };
    },
    (covers) => batches.push(covers),
  );
  assert.equal(maximum, 4);
  assert.equal(batches.length, 2);
  assert.ok(Object.keys(batches[0]).length < 16);
  assert.equal(Object.keys(batches[1]).length, 16);
  const [url, cover] = Object.entries(batches[0])[0];
  assert.equal(batches[1][url], cover, "unchanged rows keep the same cover object");
});

test("switching searches cancels queued cover work and prevents updates from the previous search", async () => {
  const controller = new AbortController();
  let requests = 0;
  let updates = 0;
  const pending = loadBookCovers(
    Array.from({ length: 100 }, (_, i) => `cover-${i}`),
    async (url) => {
      requests++;
      await delay(30);
      return { path: url, width: 160, height: 240 };
    },
    () => updates++,
    controller.signal,
  );
  controller.abort();
  await pending;
  await delay(110);
  assert.equal(requests, 4);
  assert.equal(updates, 0);
  await loadBookCovers(
    ["already-cancelled"],
    async () => {
      throw new Error("must not run");
    },
    () => updates++,
    controller.signal,
  );
  assert.equal(updates, 0);
});

test("failed covers finish loading without repeatedly retrying or replacing successful covers", async () => {
  const batches: Record<string, BookCover>[] = [];
  await loadBookCovers(
    ["good", "bad"],
    async (url) => {
      if (url === "bad") throw new Error("offline");
      return { path: "/cache/good.jpg", width: 160, height: 240 };
    },
    (covers) => batches.push(covers),
  );
  assert.equal(batches.length, 1);
  assert.equal(batches[0].bad, MISSING_COVER);
  assert.equal(batches[0].good.path, "/cache/good.jpg");
});

test("book row identities survive rerenders and reordering, including duplicate entries", () => {
  const a = book("a");
  const b = book("b");
  const before = getBookRows([a, b]);
  const rerender = getBookRows([{ ...a }, { ...b }]);
  assert.deepEqual(
    before.map((row) => row.id),
    rerender.map((row) => row.id),
  );
  const reordered = getBookRows([b, a]);
  assert.equal(before[0].id, reordered[1].id);
  assert.equal(before[1].id, reordered[0].id);
  const duplicates = getBookRows([a, a, b]);
  assert.equal(new Set(duplicates.map((row) => row.id)).size, 3);
  assert.equal(duplicates[0].id, before[0].id);
  assert.equal(duplicates[2].id, before[1].id);
});
