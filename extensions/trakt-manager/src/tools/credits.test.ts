import assert from "node:assert/strict";
import { test } from "node:test";
import { toCredits } from "../lib/credits";

const movie = (trakt: number, title: string, year?: number) => ({ title, year, ids: { trakt } });

test("a title acted in and directed appears once, with both roles", () => {
  const credits = toCredits(
    {
      cast: [{ characters: ["Joe Brody"], movie: movie(24, "Godzilla", 2014) }],
      crew: {
        directing: [{ jobs: ["Director"], movie: movie(24, "Godzilla", 2014) }],
        writing: [{ jobs: ["Screenplay"], movie: movie(30, "Wakefield", 2016) }],
      },
    },
    "movie",
  );
  assert.deepEqual(
    credits.map((credit) => [credit.title.title, credit.role]),
    [
      ["Wakefield", "Screenplay"],
      ["Godzilla", "as Joe Brody · Director"],
    ],
  );
});

test("credits are newest first, and a cast entry without characters reads Cast", () => {
  const credits = toCredits(
    {
      cast: [
        { characters: [], movie: movie(1, "Old", 1999) },
        { movie: movie(2, "Undated") },
        { movie: movie(3, "New", 2020) },
      ],
    },
    "movie",
  );
  assert.deepEqual(
    credits.map((credit) => [credit.title.title, credit.role]),
    [
      ["New", "Cast"],
      ["Old", "Cast"],
      ["Undated", "Cast"],
    ],
  );
});

test("a show credit reads its show key, and missing parts give no credit", () => {
  assert.deepEqual(toCredits({ cast: null, crew: null }, "show"), []);
  const credits = toCredits(
    { cast: [{ characters: ["Walter White"], show: movie(1388, "Breaking Bad", 2008) }] },
    "show",
  );
  assert.equal(credits[0].role, "as Walter White");
});
