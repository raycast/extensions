import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractMovieDetails,
  getSearchCursor,
  letterboxdIdFromPath,
  normalizeSearchResponse,
} from "./movie-data";
import {
  movieDetailsFixture,
  searchResponseFixture,
} from "./__fixtures__/letterboxd";

describe("Letterboxd search data", () => {
  it("normalizes rich film fields and ignores unrelated or malformed items", () => {
    const movies = normalizeSearchResponse(searchResponseFixture);

    assert.equal(movies.length, 1);
    assert.deepEqual(movies[0], {
      id: "1skk",
      letterboxdId: "inception",
      thumbnail: "https://images.example/300.jpg",
      title: "Inception",
      released: "2010",
      director: "Christopher Nolan",
      detailsPage: "/film/inception/",
      rating: 4.239,
      runtime: 148,
      genres: ["Action", "Science Fiction"],
      top250Position: 249,
      links: {
        letterboxd: "https://letterboxd.com/film/inception/",
        imdb: "https://www.imdb.com/title/tt1375666/",
        tmdb: "https://www.themoviedb.org/movie/27205",
      },
    });
  });

  it("decodes cursor links and film identifiers", () => {
    assert.equal(getSearchCursor(searchResponseFixture.next), "next==");
    assert.equal(letterboxdIdFromPath("/film/inception/"), "inception");
    assert.throws(() => letterboxdIdFromPath("/actor/christopher-nolan/"));
  });
});

describe("Letterboxd movie details", () => {
  it("extracts HTML and structured movie metadata", () => {
    const details = extractMovieDetails(
      movieDetailsFixture,
      "https://letterboxd.com/film/inception/",
      "/film/inception/",
    );

    assert.equal(details.title, "Inception");
    assert.equal(details.director, "Christopher Nolan");
    assert.equal(details.runtime, 148);
    assert.equal(details.releaseDate, "2010-07-08");
    assert.deepEqual(details.genres, ["Action", "Science Fiction"]);
    assert.deepEqual(details.languages, ["en", "fr"]);
    assert.deepEqual(details.countries, ["UK", "USA"]);
    assert.deepEqual(details.cast, [
      {
        name: "Leonardo DiCaprio",
        url: "https://letterboxd.com/actor/leonardo-dicaprio/",
      },
      { name: "Joseph Gordon-Levitt", url: undefined },
    ]);
    assert.deepEqual(details.productionCompanies, [
      { name: "Syncopy", url: "https://letterboxd.com/studio/syncopy/" },
    ]);
    assert.deepEqual(details.ratingHistogram?.rating, {
      average: 4.24,
      count: 2500000,
    });
    assert.equal(details.reviews?.[0]?.reviewerName, "Reviewer");
    assert.equal(details.reviews?.[0]?.commentCount, 12);
    assert.equal(details.releases[0]?.type, "Theatrical");
    assert.equal(
      details.releases[0]?.releases?.[0]?.countries?.[0]?.name,
      "USA",
    );
  });
});
