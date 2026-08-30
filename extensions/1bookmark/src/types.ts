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

// 북마크 캐시(CACHED_KEY_MY_BOOKMARKS)에 저장되는 데이터. 스키마 버전을 함께 저장해
// 확장 업데이트로 데이터 형태가 바뀌어도 구버전 캐시를 안전하게 걸러낼 수 있다.
export interface CachedMyBookmarks {
  schemaVersion: number;
  bookmarks: Bookmark[];
}
