import { ReactNode } from "react";

export interface SearchResult<T> {
  readonly isLoading: boolean;
  readonly errorView?: ReactNode;
  readonly data?: T[];
  readonly revalidate?: () => void;
}

export interface HistoryEntry {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly lastVisited: Date;
}

export interface BookmarkDirectory {
  readonly id: string;
  readonly name: string;
  readonly type: "folder" | "url";
  readonly url?: string;
  readonly date_added: string;
  readonly children: BookmarkDirectory[];
}

export interface BookmarkItem {
  readonly id: string;
  readonly name: string;
  readonly type: "folder" | "url";
  readonly url?: string;
  readonly path: string[]; // Breadcrumb path (names)
  readonly idPath: string[]; // ID path for navigation
  readonly children?: BookmarkDirectory[];
}

export interface BookmarkSearchResult {
  readonly isLoading: boolean;
  readonly errorView?: ReactNode;
  readonly items: BookmarkItem[];
  readonly currentPath: string[];
  readonly revalidate?: () => void;
}
