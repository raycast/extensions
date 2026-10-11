import { describe, expect, it } from "vitest";

import { githubTreeUrl, isSafeRelativePath, parseCommunityBookFile, parseCommunityIndex } from "./community";
import { ValidationError } from "./validation";

const digest = "a".repeat(64);

function entry(overrides: Record<string, unknown> = {}) {
  return {
    slug: "truyen-kieu",
    version: "1.0.0",
    title: "Truyện Kiều",
    authors: ["Nguyễn Du"],
    language: "vi",
    categories: ["poetry"],
    license: "public-domain",
    summary: "Epic poem.",
    path: "books/vi/truyen-kieu",
    files: [
      { path: "book.json", sha256: digest },
      { path: "chapters/0001.md", sha256: digest },
    ],
    ...overrides,
  };
}

function index(books: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    generatedAt: "2026-09-15T00:00:00Z",
    repository: "https://github.com/crafts69guy/ebook-hub-library/",
    ref: "main",
    books,
    ...overrides,
  };
}

const book = (overrides: Record<string, unknown> = {}) => ({
  title: "Walden",
  authors: ["Henry David Thoreau"],
  language: "en",
  categories: ["essays"],
  license: "public-domain",
  source: "https://www.gutenberg.org/ebooks/205",
  chapters: [{ title: "Economy", file: "chapters/0001.md" }],
  ...overrides,
});

describe("parseCommunityIndex", () => {
  it("parses valid entries and skips invalid ones with reasons", () => {
    const parsed = parseCommunityIndex(
      index([
        entry(),
        entry({ slug: "no-summary", summary: undefined }),
        entry({ slug: "pirated", license: "all-rights-reserved" }),
        entry({ slug: "escape", path: "../secrets" }),
        entry({ slug: "no-book", files: [{ path: "chapters/0001.md", sha256: digest }] }),
        entry({ slug: "bad-digest", files: [{ path: "book.json", sha256: "ABC" }] }),
        entry({ slug: ".hidden" }),
      ]),
    );

    expect(parsed.index.books.map((item) => item.slug)).toEqual(["truyen-kieu", "no-summary"]);
    expect(parsed.index.books[1].summary).toBe("");
    expect(parsed.skipped.map((item) => item.position)).toEqual([2, 3, 4, 5, 6]);
    expect(parsed.skipped[3].reason).toMatch(/sha256 must be a lowercase hex SHA-256 digest/);
    expect(parsed.skipped[4].reason).toMatch(/slug ".hidden" is not a valid slug/);
  });

  it("rejects an invalid envelope", () => {
    expect(() => parseCommunityIndex(index([], { schemaVersion: 2 }))).toThrow(ValidationError);
    expect(() => parseCommunityIndex(index([], { repository: "https://evil.example/repo" }))).toThrow(ValidationError);
  });

  it("builds a GitHub tree URL for an entry", () => {
    const { index: parsed } = parseCommunityIndex(index([entry()], { ref: "release/v1" }));
    expect(githubTreeUrl(parsed, parsed.books[0])).toBe(
      "https://github.com/crafts69guy/ebook-hub-library/tree/release%2Fv1/books/vi/truyen-kieu",
    );
  });
});

describe("parseCommunityBookFile", () => {
  it("requires an allowed license, safe chapter paths, and at least one chapter", () => {
    expect(parseCommunityBookFile(book()).chapters).toHaveLength(1);
    expect(() => parseCommunityBookFile(book({ license: "proprietary" }))).toThrow(ValidationError);
    expect(() => parseCommunityBookFile(book({ chapters: [{ title: "x", file: "/etc/passwd" }] }))).toThrow(
      ValidationError,
    );
    expect(() => parseCommunityBookFile(book({ chapters: [] }))).toThrow("book.json.chapters must not be empty");
  });
});

describe("isSafeRelativePath", () => {
  it.each([
    ["books/vi/truyen-kieu", true],
    ["chapters/0001.md", true],
    ["../up", false],
    ["a/./b", false],
    ["/absolute", false],
    [".hidden", false],
    ["a//b", false],
  ])("%s → %s", (path, expected) => {
    expect(isSafeRelativePath(path)).toBe(expected);
  });
});
