import { Icon } from "@raycast/api";
import { Blocklist, isBlocked } from "./blocklist";
import { Bookmark, matchBookmarks, rankBookmarks } from "./bookmarks";

const FILTER_LIMIT = 30;

export type SuggestionMode = {
  id: "all" | "history" | "bookmarks";
  action: string;
  placeholder: string;
  icon: Icon;
  key: "1" | "2" | "3";
  history?: number;
  // Bookmarks shown for an empty search (most used first) and for a search; unvisited adds the
  // bookmarks never visited after the used ones on an empty search.
  bookmarks?: { empty: number; search: number; unvisited: boolean };
};

export const MODES: SuggestionMode[] = [
  {
    id: "all",
    action: "Show All",
    placeholder: "URL or search",
    icon: Icon.List,
    key: "1",
    history: 50,
    bookmarks: { empty: 3, search: 10, unvisited: false },
  },
  {
    id: "history",
    action: "Show History Only",
    placeholder: "URL or search history",
    icon: Icon.Clock,
    key: "2",
    history: FILTER_LIMIT,
  },
  {
    id: "bookmarks",
    action: "Show Bookmarks Only",
    placeholder: "URL or search bookmarks",
    icon: Icon.Bookmark,
    key: "3",
    bookmarks: { empty: FILTER_LIMIT, search: FILTER_LIMIT, unvisited: true },
  },
];

// Rows to fetch, enough for every mode. History rows also give bookmarks their favicons.
export const HISTORY_LIMIT = Math.max(...MODES.map((m) => m.history ?? 0));
export const USED_BOOKMARKS_LIMIT = Math.max(...MODES.map((m) => m.bookmarks?.empty ?? 0));

// Sections to show for a search: bookmarks first, then history without the bookmarks above, both
// without hidden pages. Both wait for the blocklist so they never show a page hidden since loading.
export function buildSuggestions<T extends { url: string }>(
  mode: SuggestionMode,
  text: string,
  bookmarks: Bookmark[],
  used: { url: string }[],
  history: T[],
  blocklist: Blocklist | undefined,
): { bookmarks: Bookmark[]; history: T[] } {
  if (!blocklist) return { bookmarks: [], history: [] };
  const allowed = mode.bookmarks ? bookmarks.filter((b) => !isBlocked(b.url, blocklist)) : [];
  const shown = !mode.bookmarks
    ? []
    : text.trim()
      ? matchBookmarks(allowed, text).slice(0, mode.bookmarks.search)
      : rankBookmarks(allowed, used, mode.bookmarks.unvisited).slice(0, mode.bookmarks.empty);
  const shownUrls = new Set(shown.map((b) => b.url));
  return {
    bookmarks: shown,
    history: mode.history
      ? history.filter((item) => !isBlocked(item.url, blocklist) && !shownUrls.has(item.url)).slice(0, mode.history)
      : [],
  };
}
