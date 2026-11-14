import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  movieDetailsFixture,
  searchResponseFixture,
} from "./__fixtures__/letterboxd";
import { extractMovieDetails, normalizeSearchResponse } from "./movie-data";
import {
  clampToolLimit,
  normalizeFilmPath,
  toMovieDetailsToolResult,
  toSearchMoviesToolResult,
} from "./tool-results";

describe("AI tool inputs", () => {
  it("clamps limits and accepts only Letterboxd film paths", () => {
    assert.equal(clampToolLimit(undefined, 5, 10), 5);
    assert.equal(clampToolLimit(0, 5, 10), 1);
    assert.equal(clampToolLimit(0, 5, 10, 0), 0);
    assert.equal(clampToolLimit(99, 5, 10), 10);
    assert.equal(normalizeFilmPath("/film/inception/"), "/film/inception/");
    assert.equal(
      normalizeFilmPath("https://letterboxd.com/film/inception/"),
      "/film/inception/",
    );
    assert.throws(() =>
      normalizeFilmPath("https://example.com/film/inception/"),
    );
    assert.throws(() => normalizeFilmPath("/actor/leonardo-dicaprio/"));
  });
});

describe("AI tool results", () => {
  it("returns concise search results with canonical paths and external links", () => {
    const movies = normalizeSearchResponse(searchResponseFixture);
    const result = toSearchMoviesToolResult("Inception", movies, 1);

    assert.equal(result.count, 1);
    assert.equal(result.results[0]?.detailsPath, "/film/inception/");
    assert.equal(result.results[0]?.rating, 4.239);
    assert.equal(
      result.results[0]?.imdbUrl,
      "https://www.imdb.com/title/tt1375666/",
    );
  });

  it("returns bounded structured details and normalized review links", () => {
    const details = extractMovieDetails(
      movieDetailsFixture,
      "https://letterboxd.com/film/inception/",
      "/film/inception/",
    );
    const result = toMovieDetailsToolResult(details, 1, 1);

    assert.equal(result.description, "A dream within a dream.");
    assert.deepEqual(result.cast, [
      {
        name: "Leonardo DiCaprio",
        url: "https://letterboxd.com/actor/leonardo-dicaprio/",
      },
    ]);
    assert.equal(result.reviews.length, 1);
    assert.equal(result.reviews[0]?.url, "https://letterboxd.com/review/123/");
  });
});
