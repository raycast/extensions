import { RouterOutputs } from "@repo/trpc-router";

// Bookmark registration form
export interface RegisterBookmarkForm {
  title: string;
  url: string;
  description: string;
}

export interface BrowserBookmark {
  id: string;
  title: string;
  url: string;
  folder: string;
}

export type RankingEntries = Record<
  string,
  {
    keyword: string;
    count: number;
  }[]
>;

export type Bookmark = RouterOutputs["bookmark"]["listAll"][number];
export type Tag = RouterOutputs["tag"]["list"][number];

// Data stored in the bookmark cache (CACHED_KEY_MY_BOOKMARKS). The schema version is stored alongside
// it so that stale caches can be safely filtered out when an extension update changes the data shape.
export interface CachedMyBookmarks {
  schemaVersion: number;
  bookmarks: Bookmark[];
}
