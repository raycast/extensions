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
