import { describe, expect, it } from "vitest";

import type { Page } from "./pagination";
import {
  LAST_BLOCK,
  MAX_JUMPS,
  changeChapter,
  movePages,
  nextPage,
  previousPage,
  recordJump,
  type ReaderLocation,
} from "./reader-navigation";

const pages: Page[] = Array.from({ length: 8 }, (_, index) => ({
  startBlock: index * 2,
  endBlock: index * 2 + 2,
  words: 10,
}));

const at = (chapterIndex: number, pageIndex: number, chapterCount = 3): ReaderLocation => ({
  chapterCount,
  chapterIndex,
  pages,
  pageIndex,
});

describe("nextPage", () => {
  it("moves within the chapter, then into the next chapter, then stops at the end", () => {
    expect(nextPage(at(0, 0))).toEqual({
      kind: "move",
      position: { chapterIndex: 0, blockIndex: 2 },
      recordJump: false,
    });
    expect(nextPage(at(0, 7))).toEqual({
      kind: "move",
      position: { chapterIndex: 1, blockIndex: 0 },
      recordJump: false,
    });
    expect(nextPage(at(2, 7))).toEqual({
      kind: "boundary",
      message: "You reached the end of the book",
      reachedEnd: true,
    });
  });
});

describe("previousPage", () => {
  it("moves within the chapter, then to the end of the previous chapter, then stops", () => {
    expect(previousPage(at(1, 3))).toEqual({
      kind: "move",
      position: { chapterIndex: 1, blockIndex: 4 },
      recordJump: false,
    });
    expect(previousPage(at(1, 0))).toEqual({
      kind: "move",
      position: { chapterIndex: 0, blockIndex: LAST_BLOCK },
      recordJump: false,
    });
    expect(previousPage(at(0, 0))).toEqual({
      kind: "boundary",
      message: "Already at the beginning",
      reachedEnd: false,
    });
  });
});

describe("movePages", () => {
  it("jumps and records the jump when it stays in the chapter", () => {
    expect(movePages(at(0, 1), 5)).toEqual({
      kind: "move",
      position: { chapterIndex: 0, blockIndex: 12 },
      recordJump: true,
    });
    expect(movePages(at(0, 6), -5)).toEqual({
      kind: "move",
      position: { chapterIndex: 0, blockIndex: 2 },
      recordJump: true,
    });
    expect(movePages(at(0, 3), 5)).toEqual({
      kind: "move",
      position: { chapterIndex: 0, blockIndex: 14 },
      recordJump: true,
    });
  });

  it("falls back to a page turn at chapter edges", () => {
    expect(movePages(at(0, 7), 5)).toEqual(nextPage(at(0, 7)));
    expect(movePages(at(1, 0), -5)).toEqual(previousPage(at(1, 0)));
  });
});

describe("changeChapter", () => {
  it("moves to chapter starts and reports missing chapters", () => {
    expect(changeChapter(at(1, 4), 1)).toEqual({
      kind: "move",
      position: { chapterIndex: 2, blockIndex: 0 },
      recordJump: true,
    });
    expect(changeChapter(at(1, 4), -1)).toEqual({
      kind: "move",
      position: { chapterIndex: 0, blockIndex: 0 },
      recordJump: true,
    });
    expect(changeChapter(at(2, 0), 1)).toEqual({ kind: "boundary", message: "No next chapter", reachedEnd: false });
    expect(changeChapter(at(0, 0), -1)).toEqual({
      kind: "boundary",
      message: "No previous chapter",
      reachedEnd: false,
    });
  });
});

describe("recordJump", () => {
  it("appends and keeps only the most recent jumps", () => {
    const position = (blockIndex: number) => ({ chapterIndex: 0, blockIndex });
    expect(recordJump([position(1)], position(2))).toEqual([position(1), position(2)]);

    const full = Array.from({ length: MAX_JUMPS }, (_, index) => position(index));
    const next = recordJump(full, position(99));
    expect(next).toHaveLength(MAX_JUMPS);
    expect(next[0]).toEqual(position(1));
    expect(next[MAX_JUMPS - 1]).toEqual(position(99));
  });
});
