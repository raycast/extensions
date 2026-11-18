import assert from "node:assert/strict";
import { test } from "node:test";
import {
  IndexEdit,
  isWatched,
  ratingOf,
  RatingIndex,
  toRatingIndex,
  toWatchedIndex,
  WatchedIndex,
  withEditsSince,
  withRating,
  withWatched,
} from "../lib/media-state";

const ids = (trakt: number) => ({ ids: { trakt } });

test("ratings are indexed by type and Trakt id", () => {
  const index = toRatingIndex(
    [{ rating: 9, movie: ids(16662) }],
    [{ rating: 10, show: ids(154784) }],
    [{ rating: 7, episode: ids(3959823) }],
  );
  assert.equal(ratingOf(index, "movie", 16662), 9);
  assert.equal(ratingOf(index, "show", 154784), 10);
  assert.equal(ratingOf(index, "episode", 3959823), 7);
  // Movie and show ids overlap: a movie rating does not leak to a show with the same id.
  assert.equal(ratingOf(index, "show", 16662), undefined);
});

test("a new score replaces the old one, and removing it leaves the title unrated", () => {
  const index = toRatingIndex([{ rating: 6, movie: ids(1) }], [], []);
  const rerated = withRating(index, "movie", 1, 8);
  assert.equal(ratingOf(rerated, "movie", 1), 8);
  assert.equal(rerated.movies.length, 1);
  assert.equal(ratingOf(withRating(rerated, "movie", 1, undefined), "movie", 1), undefined);
});

test("watched episodes are keyed by show, season and number", () => {
  const index = toWatchedIndex(
    [{ plays: 2, movie: ids(16662) }],
    [{ plays: 3, show: ids(154784), seasons: [{ number: 2, episodes: [{ number: 3, plays: 1 }] }] }],
  );
  assert.equal(isWatched(index, { type: "movie", traktId: 16662 }), true);
  assert.equal(isWatched(index, { type: "show", traktId: 154784 }), true);
  assert.equal(isWatched(index, { type: "episode", showId: 154784, season: 2, number: 3 }), true);
  assert.equal(isWatched(index, { type: "episode", showId: 154784, season: 2, number: 4 }), false);
});

test("removing a show from history clears its episodes; the last episode removed clears the show", () => {
  const index = toWatchedIndex(
    [],
    [
      {
        plays: 2,
        show: ids(10),
        seasons: [
          {
            number: 1,
            episodes: [
              { number: 1, plays: 1 },
              { number: 2, plays: 1 },
            ],
          },
        ],
      },
    ],
  );
  const showRemoved = withWatched(index, { type: "show", traktId: 10 }, false);
  assert.equal(isWatched(showRemoved, { type: "episode", showId: 10, season: 1, number: 1 }), false);
  assert.equal(isWatched(showRemoved, { type: "show", traktId: 10 }), false);

  const oneLeft = withWatched(index, { type: "episode", showId: 10, season: 1, number: 1 }, false);
  assert.equal(isWatched(oneLeft, { type: "show", traktId: 10 }), true);
  const none = withWatched(oneLeft, { type: "episode", showId: 10, season: 1, number: 2 }, false);
  assert.equal(isWatched(none, { type: "show", traktId: 10 }), false);
});

test("marking an episode watched marks its show watched", () => {
  const index = withWatched(toWatchedIndex([], []), { type: "episode", showId: 20, season: 1, number: 1 }, true);
  assert.equal(isWatched(index, { type: "show", traktId: 20 }), true);
  assert.equal(isWatched(index, { type: "episode", showId: 20, season: 1, number: 1 }), true);
});

test("a read that arrives after a local change keeps that change", () => {
  // The read started at t=100 and still holds the old 6/10; the user re-rated at t=150, and an older
  // change from before the read (t=50) is already in what Trakt returned.
  const read = toRatingIndex([{ rating: 6, movie: ids(1) }], [], []);
  const edits: IndexEdit<RatingIndex>[] = [
    { at: 50, apply: (index) => withRating(index, "movie", 2, 3) },
    { at: 150, apply: (index) => withRating(index, "movie", 1, 9) },
  ];
  const merged = withEditsSince(read, edits, 100);
  assert.equal(ratingOf(merged, "movie", 1), 9);
  assert.equal(ratingOf(merged, "movie", 2), undefined);

  const watched = withEditsSince(
    toWatchedIndex([{ plays: 1, movie: ids(7) }], []),
    [{ at: 150, apply: (index: WatchedIndex) => withWatched(index, { type: "movie", traktId: 7 }, false) }],
    100,
  );
  assert.equal(isWatched(watched, { type: "movie", traktId: 7 }), false);
});
