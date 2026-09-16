import assert from "node:assert/strict";
import { test } from "node:test";
import { compareRows, isBetterHit, scoreLine } from "../src/lib/rank";
import type { Row } from "../src/lib/types";
import { hit, row } from "./fixtures";

test("scoreLine counts the distinct query words present", () => {
  const score = scoreLine("cache deploy rollback", ["cache", "deploy"]);
  assert.equal(score?.words, 2);
});

test("scoreLine counts a repeated word once", () => {
  const score = scoreLine("cache and cache and cache", ["cache"]);
  assert.equal(score?.words, 1);
});

test("scoreLine counts only the words that are present", () => {
  const score = scoreLine("cache only", ["cache", "deploy"]);
  assert.equal(score?.words, 1);
});

test("scoreLine returns null when nothing matches", () => {
  assert.equal(scoreLine("nothing here", ["cache", "deploy"]), null);
  assert.equal(scoreLine("", ["cache"]), null);
});

test("scoreLine ignores the casing of the line", () => {
  // parseQuery hands scoreLine lowercased words, so only the line varies.
  assert.equal(scoreLine("DEPLOY the CACHE", ["deploy", "cache"])?.words, 2);
  assert.equal(scoreLine("DePlOy", ["deploy"])?.words, 1);
});

test("scoreLine spans a single word by its own length", () => {
  assert.equal(scoreLine("hello world", ["world"])?.span, 5);
});

test("scoreLine spans from the first word to the end of the last", () => {
  // "cat dog" — 0 through 7.
  assert.equal(scoreLine("cat dog bird", ["cat", "dog"])?.span, 7);
});

test("scoreLine reports the tightest window containing every word", () => {
  // Regression: an early stray occurrence of one word must not stretch the span
  // across the whole line when a tight window exists later on.
  const filler = " x".repeat(450); // 900 chars
  const text = `deploy${filler} cache deploy`;
  assert.ok(text.length > 900);
  const score = scoreLine(text, ["cache", "deploy"]);
  assert.equal(score?.words, 2);
  assert.equal(score?.span, "cache deploy".length);
});

test("scoreLine picks the tightest window when it comes first", () => {
  const filler = " x".repeat(450);
  const text = `cache deploy${filler} deploy`;
  assert.equal(
    scoreLine(text, ["cache", "deploy"])?.span,
    "cache deploy".length,
  );
});

test("isBetterHit prefers any candidate over no current hit", () => {
  assert.equal(isBetterHit({ words: 1, span: 9999 }, undefined), true);
});

test("isBetterHit prefers more words even at a wider span", () => {
  assert.equal(isBetterHit({ words: 2, span: 500 }, hit(1, 3)), true);
  assert.equal(isBetterHit({ words: 1, span: 3 }, hit(2, 500)), false);
});

test("isBetterHit breaks a word tie on the tighter span", () => {
  assert.equal(isBetterHit({ words: 2, span: 10 }, hit(2, 11)), true);
  assert.equal(isBetterHit({ words: 2, span: 11 }, hit(2, 10)), false);
  assert.equal(isBetterHit({ words: 2, span: 10 }, hit(2, 10)), false);
});

test("compareRows orders by words, then span, then recency", () => {
  const recent = row({ project: "recent", mtimeMs: 100 }, hit(2, 10));
  const stale = row({ project: "stale", mtimeMs: 1 }, hit(2, 10));
  const loose = row({ project: "loose", mtimeMs: 500 }, hit(2, 50));
  const partial = row({ project: "partial", mtimeMs: 900 }, hit(1, 1));
  const rows: Row[] = [partial, loose, stale, recent];
  rows.sort(compareRows);
  assert.deepEqual(
    rows.map((r) => r.session.project),
    ["recent", "stale", "loose", "partial"],
  );
});

test("compareRows keeps a partial match below every all-words match", () => {
  // The partial row is both newer and tighter; it must still sort last.
  const all = row({ project: "all", mtimeMs: 1 }, hit(3, 900));
  const partial = row({ project: "partial", mtimeMs: 9999 }, hit(1, 1));
  const rows = [partial, all];
  rows.sort(compareRows);
  assert.deepEqual(
    rows.map((r) => r.session.project),
    ["all", "partial"],
  );
  // ...and it is still present, not filtered out.
  assert.equal(rows.length, 2);
});

test("compareRows sorts a row without a hit last", () => {
  const none = row({ project: "none", mtimeMs: 9999 });
  const some = row({ project: "some", mtimeMs: 1 }, hit(1, 400));
  const rows = [none, some];
  rows.sort(compareRows);
  assert.deepEqual(
    rows.map((r) => r.session.project),
    ["some", "none"],
  );
});

test("compareRows falls back to recency for identical hits", () => {
  const newer = row({ project: "newer", mtimeMs: 200 }, hit(2, 10));
  const olderRow = row({ project: "older", mtimeMs: 100 }, hit(2, 10));
  const rows = [olderRow, newer];
  rows.sort(compareRows);
  assert.deepEqual(
    rows.map((r) => r.session.project),
    ["newer", "older"],
  );
});
