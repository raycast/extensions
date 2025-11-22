import { ReactNode } from "react";

export interface SearchResult<T> {
  readonly isLoading: boolean;
  readonly error?: string;
  readonly data?: T[];
  readonly revalidate?: (...args: unknown[]) => unknown;
  readonly permissionView?: ReactNode;
}

export interface HistoryEntry {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly lastVisited: Date;
}

type BookmarkNodeType = "folder" | "url";

export interface BookmarkDirectory {
  date_added: string;
  children: BookmarkDirectory[];
  type: BookmarkNodeType;
  id: string;
  guid: string;
  source?: string;
  url?: string;
  name: string;
  [key: string]: unknown;
}

export interface RawBookmarkRoot {
  [key: string]: BookmarkDirectory;
}

export interface RawBookmarks {
  roots: RawBookmarkRoot;
  [key: string]: unknown;
}

export interface DiaProfile {
  readonly name: string;
  readonly id: string;
}
