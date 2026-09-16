import type { ReadingPosition } from "./book";
import type { Page } from "./pagination";

export const PAGE_JUMP = 5;
export const MAX_JUMPS = 50;
/** Clamped by `pageIndexForBlock` to the last page of the chapter. */
export const LAST_BLOCK = Number.MAX_SAFE_INTEGER;

export interface ReaderLocation {
  chapterCount: number;
  chapterIndex: number;
  pages: readonly Page[];
  pageIndex: number;
}

export type NavigationResult =
  | { kind: "move"; position: ReadingPosition; recordJump: boolean }
  | { kind: "boundary"; message: string; reachedEnd: boolean };

function move(position: ReadingPosition, recordJump = false): NavigationResult {
  return { kind: "move", position, recordJump };
}

export function nextPage({ chapterCount, chapterIndex, pages, pageIndex }: ReaderLocation): NavigationResult {
  if (pageIndex + 1 < pages.length) {
    return move({ chapterIndex, blockIndex: pages[pageIndex + 1].startBlock });
  }
  if (chapterIndex + 1 < chapterCount) {
    return move({ chapterIndex: chapterIndex + 1, blockIndex: 0 });
  }
  return { kind: "boundary", message: "You reached the end of the book", reachedEnd: true };
}

export function previousPage({ chapterIndex, pages, pageIndex }: ReaderLocation): NavigationResult {
  if (pageIndex > 0) {
    return move({ chapterIndex, blockIndex: pages[pageIndex - 1].startBlock });
  }
  if (chapterIndex > 0) {
    return move({ chapterIndex: chapterIndex - 1, blockIndex: LAST_BLOCK });
  }
  return { kind: "boundary", message: "Already at the beginning", reachedEnd: false };
}

/** Jump several pages within the chapter; at a chapter edge, behave like a single page turn. */
export function movePages(location: ReaderLocation, delta: number): NavigationResult {
  const target = Math.min(location.pages.length - 1, Math.max(0, location.pageIndex + delta));
  if (target === location.pageIndex) {
    return delta > 0 ? nextPage(location) : previousPage(location);
  }
  return move({ chapterIndex: location.chapterIndex, blockIndex: location.pages[target].startBlock }, true);
}

export function changeChapter(location: ReaderLocation, delta: number): NavigationResult {
  const target = location.chapterIndex + delta;
  if (target < 0 || target >= location.chapterCount) {
    return { kind: "boundary", message: delta > 0 ? "No next chapter" : "No previous chapter", reachedEnd: false };
  }
  return move({ chapterIndex: target, blockIndex: 0 }, true);
}

export function recordJump(jumps: readonly ReadingPosition[], from: ReadingPosition): ReadingPosition[] {
  return [...jumps.slice(-(MAX_JUMPS - 1)), from];
}
