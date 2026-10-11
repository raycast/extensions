import assert from "node:assert/strict";
import test from "node:test";
import { SearchPager, type PagerState } from "../src/services/search-pager";
import { demoData } from "../src/services/demo-data";
import type { SearchPage } from "../src/domain/model";

const request = { query: "", view: "tracks" as const, limit: 2 };
const tracks = demoData().library.tracks;
const first = tracks[0]!;
const second = tracks[1]!;

test("pagination advances cursors and deduplicates overlapping results without collapsing names", async () => {
  let state: PagerState | undefined;
  const cursors: (string | undefined)[] = [];
  const pager = new SearchPager(
    async (req) => {
      cursors.push(req.cursor);
      return req.cursor
        ? { items: [first, { ...first, uri: "other:track" }] }
        : { items: [first], nextCursor: "page2" };
    },
    request,
    (next) => {
      state = next;
    },
  );
  await pager.loadMore();
  await pager.loadMore();
  await pager.loadMore();
  assert.deepEqual(cursors, [undefined, "page2"]);
  assert.equal(state?.items.length, 2);
  assert.equal(state?.hasMore, false);
});

test("overlapping load requests are serialized and disposed generations never publish late responses", async () => {
  let resolve!: (page: SearchPage) => void;
  let calls = 0;
  const states: PagerState[] = [];
  const pager = new SearchPager(
    () => {
      calls++;
      return new Promise((done) => {
        resolve = done;
      });
    },
    request,
    (state) => states.push(state),
  );
  const pending = pager.loadMore();
  await pager.loadMore();
  pager.dispose();
  resolve({ items: tracks });
  await pending;
  assert.equal(calls, 1);
  assert.equal(states.length, 1);
  assert.deepEqual(states[0]?.items, []);
});

test("a failed later page retains loaded rows and retries the same cursor", async () => {
  let state: PagerState | undefined;
  let fail = true;
  const pager = new SearchPager(
    async (req) => {
      if (!req.cursor) return { items: [first], nextCursor: "next" };
      if (fail) {
        fail = false;
        throw new Error("offline");
      }
      return { items: [second] };
    },
    request,
    (next) => {
      state = next;
    },
  );
  await pager.loadMore();
  await pager.loadMore();
  assert.equal(state?.items.length, 1);
  assert.ok(state?.error);
  await pager.loadMore();
  assert.equal(state?.items.length, 2);
  assert.equal(state?.error, undefined);
});

test("repeated cursors stop automatic pagination", async () => {
  let calls = 0;
  const pager = new SearchPager(
    async () => {
      calls++;
      return { items: [], nextCursor: "same" };
    },
    request,
    () => {},
  );
  await pager.loadMore();
  await pager.loadMore();
  await pager.loadMore();
  assert.equal(calls, 2);
});
