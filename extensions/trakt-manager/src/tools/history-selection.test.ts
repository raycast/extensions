import assert from "node:assert/strict";
import { test } from "node:test";
import { toCompactRating, type CompactRatingItem } from "./compact-media";
import { pickCandidates, type HistoryCandidate } from "./history-candidates";
import { pickRatingMatches } from "./rating-lookup";
import { scanPageComplete } from "../lib/schema";
import { assertSyncAdded, readSyncWrite } from "./sync-write";
import { describeYearFilter, isMatchableTitle, normalizeTitle, resolveLookupQuery } from "./title-text";

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

function rated(title: string, year: number, score: number, traktId: number): CompactRatingItem {
  return { type: "movie", title, year, rating: score, ratedAt: "2024-01-01T00:00:00.000Z", traktId };
}

test("a rating score filter does not hide a title rated something else", () => {
  const picked = pickRatingMatches([rated("Dune", 2021, 8, 1)], "Dune", undefined, undefined, 10);
  assert.equal(picked.exact.length, 0);
  assert.equal(picked.scoreMismatched[0]?.rating, 8);
});

test("a rating year miss is not treated as an exact match for another release", () => {
  const picked = pickRatingMatches([rated("Dune", 2021, 8, 1)], "Dune", undefined, 1989);
  assert.equal(picked.exact.length, 0);
  assert.equal(picked.yearHeldBy[0]?.year, 2021);
});

test("a rating with no year is not a confirmed year match or a year miss", () => {
  const picked = pickRatingMatches(
    [{ type: "episode", title: "Good News About Hell", rating: 9, ratedAt: "2024-01-01T00:00:00.000Z", traktId: 99 }],
    "Good News About Hell",
    undefined,
    2022,
  );
  assert.equal(picked.exact.length, 0);
  assert.equal(picked.yearHeldBy.length, 0);
  assert.equal(picked.yearUnknown[0]?.traktId, 99);
});

test("season and episode ratings inherit the parent show year", () => {
  const episode = toCompactRating({
    rated_at: "2024-01-01T00:00:00.000Z",
    rating: 9,
    type: "episode",
    show: { title: "Severance", year: 2022, ids: { trakt: 154784, imdb: "tt11280740" } },
    episode: { season: 1, number: 1, title: "Good News About Hell", ids: { trakt: 99 } },
  });
  assert.equal(episode.year, 2022);

  const season = toCompactRating({
    rated_at: "2024-01-01T00:00:00.000Z",
    rating: 8,
    type: "season",
    show: { title: "Severance", year: 2022, ids: { trakt: 154784, imdb: "tt11280740" } },
    season: { number: 1, ids: { trakt: 88 } },
  });
  assert.equal(season.year, 2022);

  const picked = pickRatingMatches([episode], "Good News About Hell", undefined, 2022);
  assert.equal(picked.exact[0]?.traktId, 99);
  assert.equal(picked.yearHeldBy.length, 0);
});

test("readSyncWrite distinguishes added from already present", () => {
  const existing = readSyncWrite(
    { added: { movies: 0 }, existing: { movies: 1 }, not_found: { movies: [] } },
    "movies",
  );
  assert.equal(existing.added, 0);
  assert.equal(existing.existing, 1);
  assert.equal(existing.notFound, 0);

  const missing = readSyncWrite(
    { added: { movies: 0 }, existing: { movies: 0 }, not_found: { movies: [{}] } },
    "movies",
  );
  assert.equal(missing.notFound, 1);
});

test("describeYearFilter does not claim a missing year when the page is truncated", () => {
  const truncated = describeYearFilter("Dune", 1723, 0, 50, true);
  assert.match(truncated ?? "", /NOT proof/i);
  const genuine = describeYearFilter("Dune", 1723, 0, 4, false);
  assert.match(genuine ?? "", /has no 1723 release/);
});

test("a trailing year in the query is a year filter, not part of the title", () => {
  assert.deepEqual(resolveLookupQuery("Dune 1989"), { text: "Dune", year: 1989 });
  assert.deepEqual(resolveLookupQuery("Dune (1989)"), { text: "Dune", year: 1989 });
  assert.deepEqual(resolveLookupQuery("Dune 1989", 2021), { text: "Dune", year: 2021 });

  const dunes = [movie("Dune", 2021, 1), movie("Dune", 1984, 2), movie("Dune", 1989, 468289)];
  const picked = pickCandidates(dunes, "Dune 1989");
  assert.deepEqual(
    picked.candidates.map((item) => item.traktId),
    [468289],
  );
  assert.equal(picked.yearHeldBy.length, 0);

  const rated = pickRatingMatches(
    [
      { type: "movie", title: "Dune", year: 2021, rating: 8, ratedAt: "2024-01-01T00:00:00.000Z", traktId: 1 },
      { type: "movie", title: "Dune", year: 1989, rating: 7, ratedAt: "2024-01-01T00:00:00.000Z", traktId: 468289 },
    ],
    "Dune 1989",
    undefined,
  );
  assert.equal(rated.exact[0]?.traktId, 468289);
  assert.equal(rated.yearHeldBy[0]?.year, 2021);
});

test("1984 stays a title and Blade Runner 2049 is not stripped to Blade Runner", () => {
  assert.deepEqual(resolveLookupQuery("1984"), { text: "1984", year: undefined });
  assert.deepEqual(resolveLookupQuery("Blade Runner 2049"), { text: "Blade Runner", year: 2049 });

  const picked = pickCandidates(
    [movie("Blade Runner", 1982, 1), movie("Blade Runner 2049", 2017, 2)],
    "Blade Runner 2049",
  );
  assert.deepEqual(
    picked.candidates.map((item) => item.traktId),
    [2],
  );

  const nineteenEightyFour = pickCandidates([movie("1984", 1984, 9), movie("Nineteen Eighty-Four", 1954, 8)], "1984");
  assert.deepEqual(
    nineteenEightyFour.candidates.map((item) => item.traktId),
    [9],
  );
});

test("scanPageComplete uses the served limit, not the requested one", () => {
  const clamped = {
    "x-pagination-page": 1,
    "x-pagination-limit": 100,
    "x-pagination-page-count": 3,
    "x-pagination-item-count": 250,
  };
  assert.equal(scanPageComplete(100, clamped, 250), false);
  assert.equal(scanPageComplete(40, clamped, 250), true);

  const last = { ...clamped, "x-pagination-page": 3 };
  assert.equal(scanPageComplete(100, last, 250), true);
});

test("a 201 with every count at zero is not a write", () => {
  const empty = readSyncWrite({ added: { movies: 0 }, existing: { movies: 0 }, not_found: { movies: [] } }, "movies");
  assert.throws(() => assertSyncAdded(empty, "Dune"), /did not add/i);

  const existing = readSyncWrite(
    { added: { movies: 0 }, existing: { movies: 1 }, not_found: { movies: [] } },
    "movies",
  );
  assert.doesNotThrow(() => assertSyncAdded(existing, "Dune"));

  const added = readSyncWrite({ added: { movies: 1 }, existing: { movies: 0 }, not_found: { movies: [] } }, "movies");
  assert.doesNotThrow(() => assertSyncAdded(added, "Dune"));
});
