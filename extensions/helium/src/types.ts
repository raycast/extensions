// Internal Helium tab model.
//
// `id` is the stable Helium AppleScript tab id and is the only identity used
// throughout the UI, optimistic state, and actions. `favicon` is optional
// display-only metadata when the Raycast Browser Extension can provide it.
export interface Tab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
}

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
  type: "search" | "url" | "bang";
  providerName?: string;
}

// Bookmark entry read from the Helium profile's Bookmarks file.
// `folder` is the "Parent/Child" folder path, unset for top-level bookmarks.
export interface Bookmark {
  id: string;
  url: string;
  title: string;
  folder?: string;
}
