import type { BookManifest, Bookmark, ChapterRef, ReadingPosition } from "./book";
import type { Page } from "./pagination";

const WORDS_PER_MINUTE = 230;

/** Percentage of the book read through the end of the current page. */
export function computePercent(
  chapters: readonly ChapterRef[],
  totalWords: number,
  chapterIndex: number,
  pages: readonly Page[],
  pageIndex: number,
): number {
  if (totalWords <= 0) {
    return 0;
  }
  const before = chapters.slice(0, chapterIndex).reduce((sum, chapter) => sum + chapter.words, 0);
  const within = pages.slice(0, pageIndex + 1).reduce((sum, page) => sum + page.words, 0);
  return Math.min(100, Math.max(0, Math.round(((before + within) / totalWords) * 100)));
}

export function clampPosition(book: Pick<BookManifest, "chapters">, position: ReadingPosition): ReadingPosition {
  const lastChapter = Math.max(0, book.chapters.length - 1);
  return {
    chapterIndex: Math.min(lastChapter, Math.max(0, position.chapterIndex)),
    blockIndex: Math.max(0, position.blockIndex),
  };
}

export function findBookmarkOnPage(bookmarks: readonly Bookmark[], chapterIndex: number, page: Page): Bookmark | null {
  const endBlock = Math.max(page.endBlock, page.startBlock + 1);
  return (
    bookmarks.find(
      (bookmark) =>
        bookmark.chapterIndex === chapterIndex &&
        bookmark.blockIndex >= page.startBlock &&
        bookmark.blockIndex < endBlock,
    ) ?? null
  );
}

export function sortBookmarks(bookmarks: readonly Bookmark[]): Bookmark[] {
  return [...bookmarks].sort((a, b) => a.chapterIndex - b.chapterIndex || a.blockIndex - b.blockIndex);
}

export function formatReadingTime(words: number): string {
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
