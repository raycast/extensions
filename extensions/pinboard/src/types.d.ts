export interface PinboardBookmark {
  href: string;
  description: string;
  extended: string;
  meta: string;
  hash: string;
  time: string;
  shared: "yes" | "no";
  toread: "yes" | "no";
  tags: string;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  tags?: string;
  private: boolean;
  readLater: boolean;
}

export interface BookmarksState {
  bookmarks: Bookmark[];
  isLoading: boolean;
  title: string;
}

export enum SearchKind {
  Constant,
  All,
}

export type LastUpdated = {
  update_time: string;
};

export type BookmarkFormValues = {
  url: string;
  title: string;
  tags: string;
  private: boolean;
  readLater: boolean;
};

export interface BookmarksResponse {
  bookmarks: Bookmark[];
}
