import { BrowserExtension } from "@raycast/api";

// Re-export the Tab type from BrowserExtension, extended with the Helium
// AppleScript `id` bridged in at fetch time. `heliumId` is optional because a
// tab may not resolve (e.g., if the Helium app is not running or the AS lookup
// fails); callers should fall back to URL-based operations in that case.
export type Tab = BrowserExtension.Tab & { heliumId?: string };

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
