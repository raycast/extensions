import assert from "node:assert/strict";
import { test } from "node:test";
import { pickCandidates, type HistoryCandidate } from "./history-candidates";
import { describeYearFilter, isMatchableTitle, normalizeTitle } from "./title-text";

function movie(title: string, year: number, traktId: number): HistoryCandidate {
  return { type: "movie", title, year, traktId };
}

test("normalizeTitle folds accents so Amelie matches Amélie", () => {
  assert.equal(normalizeTitle("Amelie"), normalizeTitle("Amélie"));
  assert.equal(normalizeTitle("Pokémon"), normalizeTitle("Pokemon"));
});

test("normalizeTitle keeps non-Latin letters and digits", () => {
  assert.equal(normalizeTitle("進撃の巨人"), "進撃の巨人");
  assert.equal(normalizeTitle("Война и мир"), "воина и мир");
  assert.equal(normalizeTitle("進撃の巨人"), normalizeTitle("  進撃の巨人  "));
  assert.equal(isMatchableTitle("進撃の巨人"), true);
  assert.equal(isMatchableTitle("Война и мир"), true);
});

test("normalizeTitle keeps Devanagari vowel signs so distinct titles stay distinct", () => {
  assert.notEqual(normalizeTitle("माल"), normalizeTitle("मल"));
  assert.notEqual(normalizeTitle("माता"), normalizeTitle("मत"));
  assert.equal(isMatchableTitle("माल"), true);

  const picked = pickCandidates([movie("माल", 2019, 1), movie("मल", 2020, 2)], "माल");
  assert.deepEqual(
    picked.candidates.map((item) => item.traktId),
    [1],
  );
  assert.equal(picked.approximated, false);
});

test("a query that normalizes to nothing is not comparable", () => {
  assert.equal(normalizeTitle("🎉"), "");
  assert.equal(normalizeTitle("???"), "");
  assert.equal(isMatchableTitle("🎉"), false);
  assert.equal(isMatchableTitle("— —"), false);

  const picked = pickCandidates([movie("🎉", 2024, 1), movie("Dune", 2021, 2)], "🎉");
  assert.equal(picked.candidates.length, 0);
  assert.equal(picked.approximated, true);
});

test("CJK titles match each other and not an English alias", () => {
  const picked = pickCandidates([movie("進撃の巨人", 2013, 1), movie("Attack on Titan", 2013, 2)], "進撃の巨人");
  assert.deepEqual(
    picked.candidates.map((item) => item.traktId),
    [1],
  );
  assert.equal(picked.approximated, false);
});

test("Dune 1989 is kept when the four exact-title Dunes are in the pool", () => {
  const picked = pickCandidates(
    [movie("Dune", 2021, 1), movie("Dune", 1984, 2), movie("Dune", 2020, 3), movie("Dune", 1989, 468289)],
    "Dune",
    1989,
  );
  assert.deepEqual(
    picked.candidates.map((item) => item.traktId),
    [468289],
  );
  assert.equal(picked.approximated, false);
  assert.equal(picked.yearHeldBy.length, 0);
});

test("Dune 2026 is not checked as Dune: Part Three", () => {
  const picked = pickCandidates([movie("Dune", 2021, 1), movie("Dune: Part Three", 2026, 99)], "Dune", 2026);
  assert.equal(picked.candidates.length, 0);
  assert.equal(picked.yearHeldBy[0]?.title, "Dune: Part Three");
});

test("Hamlet over the probe cap reports unchecked instead of silently dropping", () => {
  const hamlets = Array.from({ length: 12 }, (_, index) => movie("Hamlet", 1900 + index, index + 1));
  const picked = pickCandidates(hamlets, "Hamlet");
  assert.equal(picked.candidates.length, 8);
  assert.equal(picked.unchecked.length, 4);
  assert.equal(picked.approximated, false);
});

test("a query with no exact title is approximated, not exhaustive", () => {
  const picked = pickCandidates([movie("Sniper Butterfly", 2025, 1), movie("Butterfly Effect", 2004, 2)], "Butterfly");
  assert.equal(picked.approximated, true);
  assert.equal(picked.candidates.length, 2);
});

test("describeYearFilter does not claim a missing year when the page is truncated", () => {
  const truncated = describeYearFilter("Dune", 1723, 0, 50, true);
  assert.match(truncated ?? "", /NOT proof/i);
  const genuine = describeYearFilter("Dune", 1723, 0, 4, false);
  assert.match(genuine ?? "", /has no 1723 release/);
});
