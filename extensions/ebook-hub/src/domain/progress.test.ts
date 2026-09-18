import { describe, expect, it } from "vitest";

import type { Bookmark, ChapterRef } from "./book";
import { clampPosition, computePercent, findBookmarkOnPage, formatReadingTime, sortBookmarks } from "./progress";

const chapters: ChapterRef[] = [
  { title: "A", file: "0001.md", words: 100 },
  { title: "B", file: "0002.md", words: 300 },
];
const pages = [
  { startBlock: 0, endBlock: 2, words: 150 },
  { startBlock: 2, endBlock: 4, words: 150 },
];

const bookmark = (chapterIndex: number, blockIndex: number): Bookmark => ({
  chapterIndex,
  blockIndex,
  excerpt: `${chapterIndex}:${blockIndex}`,
  createdAt: "2026-09-15T00:00:00Z",
});

describe("computePercent", () => {
  it("counts previous chapters and pages through the current one", () => {
    expect(computePercent(chapters, 400, 1, pages, 0)).toBe(63);
  });

  it("returns 0 for books without words and clamps to 100", () => {
    expect(computePercent(chapters, 0, 0, pages, 0)).toBe(0);
    expect(computePercent(chapters, 100, 1, pages, 1)).toBe(100);
  });
});

describe("clampPosition", () => {
  it("keeps positions inside the book", () => {
    expect(clampPosition({ chapters }, { chapterIndex: 5, blockIndex: -3 })).toEqual({
      chapterIndex: 1,
      blockIndex: 0,
    });
    expect(clampPosition({ chapters }, { chapterIndex: -1, blockIndex: 7 })).toEqual({
      chapterIndex: 0,
      blockIndex: 7,
    });
    expect(clampPosition({ chapters: [] }, { chapterIndex: 2, blockIndex: 2 })).toEqual({
      chapterIndex: 0,
      blockIndex: 2,
    });
  });
});

describe("bookmarks", () => {
  const bookmarks = [bookmark(1, 2), bookmark(0, 3), bookmark(1, 0)];

  it("finds a bookmark inside the page range of the same chapter", () => {
    expect(findBookmarkOnPage(bookmarks, 1, { startBlock: 2, endBlock: 4, words: 10 })).toEqual(bookmark(1, 2));
    expect(findBookmarkOnPage(bookmarks, 0, { startBlock: 2, endBlock: 4, words: 10 })).toEqual(bookmark(0, 3));
    expect(findBookmarkOnPage(bookmarks, 0, { startBlock: 0, endBlock: 2, words: 10 })).toBeNull();
  });

  it("treats an empty page as covering its start block", () => {
    expect(findBookmarkOnPage(bookmarks, 1, { startBlock: 0, endBlock: 0, words: 0 })).toEqual(bookmark(1, 0));
  });

  it("sorts by chapter then block without mutating the input", () => {
    expect(sortBookmarks(bookmarks)).toEqual([bookmark(0, 3), bookmark(1, 0), bookmark(1, 2)]);
    expect(bookmarks[0]).toEqual(bookmark(1, 2));
  });
});

describe("formatReadingTime", () => {
  it.each([
    [0, "1 min"],
    [230 * 59, "59 min"],
    [230 * 60, "1 h"],
    [230 * 75, "1 h 15 min"],
  ])("%i words → %s", (words, expected) => {
    expect(formatReadingTime(words)).toBe(expected);
  });
});
