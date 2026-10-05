import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_RECENTS, parse, rank, remember } from "../src/lib/recents.ts";

test("parse tolerates an empty store", () => {
  assert.deepEqual(parse(undefined), {});
  assert.deepEqual(parse(""), {});
});

/** A corrupt store costs the user their recent list, once, and silently. */
test("parse tolerates junk", () => {
  assert.deepEqual(parse("{not json"), {});
  assert.deepEqual(parse("[1,2,3]"), {});
  assert.deepEqual(parse("null"), {});
});

/**
 * A non-numeric timestamp would sort unpredictably and never be evicted,
 * since eviction compares timestamps.
 */
test("parse drops entries that aren't usable timestamps", () => {
  assert.deepEqual(parse('{"a":1,"b":"yesterday","c":null}'), { a: 1 });
});

test("remember records the moment a row was used", () => {
  assert.deepEqual(remember({}, "vim›Panes›Split", 1000), { "vim›Panes›Split": 1000 });
});

test("using a row again moves it rather than duplicating it", () => {
  const first = remember({}, "a", 1000);
  const second = remember(first, "a", 2000);
  assert.deepEqual(second, { a: 2000 });
});

test("the store is capped, and the oldest entries are what go", () => {
  let recents = {};
  for (let i = 0; i < MAX_RECENTS + 10; i++) recents = remember(recents, `id-${i}`, i);
  const ids = Object.keys(recents);
  assert.equal(ids.length, MAX_RECENTS);
  assert.ok(!ids.includes("id-0"), "the oldest should have been evicted");
  assert.ok(ids.includes(`id-${MAX_RECENTS + 9}`), "the newest must survive");
});

/**
 * Recency, not frequency: in a launcher the thing you want is almost always
 * the thing you just wanted.
 */
test("rank returns the most recent first", () => {
  const recents = { a: 1, b: 3, c: 2 };
  assert.deepEqual(rank(recents, new Set(["a", "b", "c"])), ["b", "c", "a"]);
});

/** Sheets change. A remembered row from a deleted sheet must not linger. */
test("rank drops ids that no longer exist", () => {
  assert.deepEqual(rank({ gone: 2, here: 1 }, new Set(["here"])), ["here"]);
});

test("rank honours its limit", () => {
  assert.deepEqual(rank({ a: 1, b: 2, c: 3 }, new Set(["a", "b", "c"]), 2), ["c", "b"]);
});
