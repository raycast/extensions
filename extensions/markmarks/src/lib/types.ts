export interface Bookmark {
  title: string;
  url: string;
  description?: string;
  line: number; // Line number in the file for editing/deletion
}

export interface BookmarkGroup {
  name: string;
  level: number; // 1-6 for heading depth (h1-h6)
  bookmarks: Bookmark[];
  children: BookmarkGroup[];
  startLine: number; // Line number where the heading starts
}

export interface ParsedBookmarks {
  groups: BookmarkGroup[];
  rootBookmarks: Bookmark[]; // Bookmarks before any heading
  rawContent: string;
}

export interface ActiveTab {
  title: string;
  url: string;
}

export type SupportedBrowser = "Safari" | "Google Chrome" | "Arc" | "Dia";
