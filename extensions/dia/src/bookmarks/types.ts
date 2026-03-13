import { ReactNode } from "react";

/**
 * Represents a bookmark directory node in the tree structure
 * from the Bookmarks file
 */
export interface BookmarkDirectory {
  readonly id: string;
  readonly name: string;
  readonly type: "folder" | "url";
  readonly url?: string;
  readonly date_added: string;
  readonly children: BookmarkDirectory[];
}

/**
 * Represents a bookmark item with navigation path information
 * Used for display and navigation in the UI
 */
export interface BookmarkItem {
  readonly id: string;
  readonly name: string;
  readonly type: "folder" | "url";
  readonly url?: string;
  readonly path: string[]; // Breadcrumb path (names)
  readonly idPath: string[]; // ID path for navigation
  readonly children?: BookmarkDirectory[];
}

/**
 * Result returned by the bookmark search hook
 */
export interface BookmarkSearchResult {
  readonly isLoading: boolean;
  readonly errorView?: ReactNode;
  readonly items: BookmarkItem[];
  readonly currentPath: string[];
  readonly revalidate?: () => void;
}

/**
 * Parsed search query with include and exclude terms
 */
export interface BookmarkParsedQuery {
  includeTerms: string[];
  excludeTerms: string[];
}
