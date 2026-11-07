import { WebCullBookmark } from "../types";

const TOKEN_SPLIT = /[\s/._:-]+/;

export function searchBookmarks(bookmarks: WebCullBookmark[], query: string): WebCullBookmark[] {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return bookmarks;
  }

  return bookmarks
    .map((bookmark) => ({
      bookmark,
      score: scoreBookmark(bookmark, normalizedQuery),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.bookmark);
}

function scoreBookmark(bookmark: WebCullBookmark, normalizedQuery: string): number {
  const searchText = normalize(
    [bookmark.title, bookmark.url, bookmark.parentStackPath, ...(bookmark.tags || [])]
      .filter(Boolean)
      .join(" "),
  );

  if (searchText.includes(normalizedQuery)) {
    return 100 + normalizedQuery.length;
  }

  const tokens = normalizedQuery.split(TOKEN_SPLIT).filter(Boolean);
  let score = 0;

  for (const token of tokens) {
    if (!searchText.includes(token)) {
      return 0;
    }

    score += token.length;
  }

  return score;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
