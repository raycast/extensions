import { BrowserExtension } from "@raycast/api";

// Re-export the Tab type from BrowserExtension for convenience
export type Tab = BrowserExtension.Tab;

// History entry from browsing history database
export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  lastVisitedAt: string;
}

// Search suggestion from search engine or direct URL
export interface Suggestion {
  id: string;
  query: string;
  url: string;
  type: "search" | "url";
}

// Bookmark entry from Helium via AppleScript
export interface Bookmark {
  id: string;
  url: string;
  title: string;
  folder?: string;
}
