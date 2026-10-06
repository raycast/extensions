import assert from "node:assert/strict";
import { test } from "node:test";
import { toCompactPausedMovie } from "./compact-media";
import { confirmHasMore } from "./page-lookahead";

function headers(page: number, pageCount: number, limit = 20) {
  return {
    "x-pagination-page": page,
    "x-pagination-limit": limit,
    "x-pagination-page-count": pageCount,
    "x-pagination-item-count": pageCount * limit,
  };
}

function nextPage(length: number | Error) {
  let calls = 0;
  return {
    fetch: async () => {
      calls++;
      if (length instanceof Error) throw length;
      return length;
    },
    calls: () => calls,
  };
}

test("a short page has no next page and is not looked ahead", async () => {
  const next = nextPage(5);
  assert.equal(await confirmHasMore(12, headers(1, 3), 20, next.fetch), false);
  assert.equal(next.calls(), 0);
});

test("the last page by page count has no next page and is not looked ahead", async () => {
  const next = nextPage(5);
  assert.equal(await confirmHasMore(20, headers(2, 2), 20, next.fetch), false);
  assert.equal(next.calls(), 0);
});

test("a full page whose next page is empty has no next page", async () => {
  const next = nextPage(0);
  assert.equal(await confirmHasMore(20, headers(1, 2), 20, next.fetch), false);
  assert.equal(next.calls(), 1);
});

test("a full page whose next page has items has a next page", async () => {
  const next = nextPage(3);
  assert.equal(await confirmHasMore(20, headers(1, 2), 20, next.fetch), true);
  assert.equal(next.calls(), 1);
});

test("a failed lookahead keeps maybe more instead of failing the page", async () => {
  const next = nextPage(new Error("HTTP 500"));
  assert.equal(await confirmHasMore(20, headers(1, 2), 20, next.fetch), true);
});

test("a page without pagination headers is the whole list", async () => {
  // Playback paginates only on request; without headers Trakt sent every item at once.
  // Missing headers parse to 0, so page >= page count stops the scan without a lookahead.
  const next = nextPage(5);
  assert.equal(await confirmHasMore(20, headers(0, 0, 0), 20, next.fetch), false);
  assert.equal(next.calls(), 0);
});

test("the served limit wins over the requested one", async () => {
  // Trakt clamped the page to 10: 10 items is a full page even though 20 were asked.
  const next = nextPage(1);
  assert.equal(await confirmHasMore(10, headers(1, 4, 10), 20, next.fetch), true);
  assert.equal(next.calls(), 1);
});

test("a paused movie keeps its progress and minutes left", () => {
  const entry = {
    id: 37,
    type: "movie" as const,
    progress: 62.4,
    paused_at: "2026-10-04T21:40:00.000Z",
    movie: { title: "Inception", year: 2010, ids: { trakt: 16662, imdb: "tt1375666" }, runtime: 148 },
  };
  assert.deepEqual(toCompactPausedMovie(entry), {
    traktId: 16662,
    title: "Inception",
    year: 2010,
    progressPercent: 62,
    minutesLeft: 56,
    pausedAt: "2026-10-04T21:40:00.000Z",
  });
});

test("a paused movie without runtime has no minutes left", () => {
  const entry = {
    id: 38,
    type: "movie" as const,
    progress: 99.9,
    paused_at: "2026-10-04T21:40:00.000Z",
    movie: { title: "Untitled", ids: { trakt: 1, imdb: "" } },
  };
  assert.equal(toCompactPausedMovie(entry).minutesLeft, undefined);
});
