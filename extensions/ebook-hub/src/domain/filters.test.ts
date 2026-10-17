import { describe, expect, it } from "vitest";

import { collectFacets, decodeFilter, encodeFilter, filterBooks, type BookFilter, type Filterable } from "./filters";

const books: Filterable[] = [
  { title: "Truyện Kiều", authors: ["Nguyễn Du"], language: "vi", categories: ["poetry"], visibility: "shared" },
  { title: "Walden", authors: ["Henry David Thoreau"], language: "en", categories: ["essays"], visibility: "private" },
  {
    title: "Leaves of Grass",
    authors: ["Walt Whitman"],
    language: "en",
    categories: ["poetry"],
    visibility: "private",
  },
];

describe("filter encoding", () => {
  it.each<BookFilter>([
    { kind: "all" },
    { kind: "language", code: "vi" },
    { kind: "category", name: "poetry" },
    { kind: "visibility", visibility: "private" },
  ])("round-trips %j", (filter) => {
    expect(decodeFilter(encodeFilter(filter))).toEqual(filter);
  });

  it("falls back to all for unknown values", () => {
    expect(decodeFilter("visibility:public")).toEqual({ kind: "all" });
    expect(decodeFilter("garbage")).toEqual({ kind: "all" });
  });
});

describe("filterBooks", () => {
  it("combines facet filters with diacritic-insensitive search", () => {
    const titles = (filter: BookFilter, query: string) => filterBooks(books, filter, query).map((book) => book.title);

    expect(titles({ kind: "category", name: "poetry" }, "")).toEqual(["Truyện Kiều", "Leaves of Grass"]);
    expect(titles({ kind: "all" }, "nguyen du")).toEqual(["Truyện Kiều"]);
    expect(titles({ kind: "language", code: "en" }, "poetry")).toEqual(["Leaves of Grass"]);
    expect(titles({ kind: "visibility", visibility: "private" }, "")).toEqual(["Walden", "Leaves of Grass"]);
  });
});

describe("collectFacets", () => {
  it("returns sorted unique languages and categories", () => {
    expect(collectFacets(books)).toEqual({ languages: ["en", "vi"], categories: ["essays", "poetry"] });
  });
});
