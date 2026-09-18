import { describe, expect, it } from "vitest";

import { chapterFileName, isValidBookId, parseManifest, parseProgress } from "./manifest";
import { ValidationError } from "./validation";

const BOOK_ID = "3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

const manifest = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  id: BOOK_ID,
  title: "Walden",
  authors: ["Henry David Thoreau"],
  language: "en",
  categories: [],
  license: null,
  visibility: "private",
  source: { kind: "import", format: "md", fileName: "walden.md" },
  chapters: [{ title: "Economy", file: "0001.md", words: 3 }],
  totalWords: 3,
  createdAt: "2026-09-15T00:00:00.000Z",
  updatedAt: "2026-09-15T00:00:00.000Z",
  ...overrides,
});

const progress = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  position: { chapterIndex: 0, blockIndex: 1 },
  percent: 10,
  bookmarks: [{ chapterIndex: 0, blockIndex: 1, createdAt: "2026-09-15T00:00:00.000Z" }],
  updatedAt: "2026-09-15T00:00:00.000Z",
  ...overrides,
});

describe("parseManifest", () => {
  it("parses imported and community books", () => {
    expect(parseManifest(manifest())).toEqual(manifest());
    const community = {
      kind: "community",
      slug: "walden",
      version: "1.0.0",
      indexUrl: "https://cdn.example/index.json",
    };
    expect(parseManifest(manifest({ source: community })).source).toEqual(community);
  });

  it.each([
    ["schemaVersion", { schemaVersion: 2 }, /schemaVersion 2 is not supported/],
    ["id", { id: "nope" }, /not a valid book id/],
    ["visibility", { visibility: "public" }, /visibility "public" is not supported/],
    ["empty chapters", { chapters: [] }, /chapters must not be empty/],
    ["chapter file", { chapters: [{ title: "C", file: "../x.md", words: 1 }] }, /not a valid chapter file name/],
    [
      "source format",
      { source: { kind: "import", format: "doc", fileName: "x.doc" } },
      /format "doc" is not supported/,
    ],
    ["source kind", { source: { kind: "web" } }, /kind "web" is not supported/],
  ])("rejects an invalid %s", (_field, overrides, message) => {
    expect(() => parseManifest(manifest(overrides))).toThrow(message);
  });
});

describe("parseProgress", () => {
  it("defaults missing bookmark excerpts to an empty string", () => {
    expect(parseProgress(progress()).bookmarks[0].excerpt).toBe("");
  });

  it.each([
    [{ schemaVersion: 3 }, /schemaVersion 3 is not supported/],
    [{ percent: 101 }, /percent must be a number between 0 and 100/],
    [{ percent: -1 }, /percent must be a number between 0 and 100/],
    [{ percent: "5" }, /percent must be a number between 0 and 100/],
  ])("rejects %j", (overrides, message) => {
    expect(() => parseProgress(progress(overrides))).toThrow(message);
  });

  it("throws ValidationError for non-objects", () => {
    expect(() => parseProgress(null)).toThrow(ValidationError);
  });
});

describe("book ids and chapter files", () => {
  it("validates ids and pads chapter file names", () => {
    expect(isValidBookId(BOOK_ID)).toBe(true);
    expect(isValidBookId("../etc")).toBe(false);
    expect(chapterFileName(0)).toBe("0001.md");
    expect(chapterFileName(41)).toBe("0042.md");
  });
});
