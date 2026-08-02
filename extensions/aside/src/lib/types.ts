// Shared data shapes for the command UI and AI tools.

export interface Tab {
  // Stable per-session id from Aside's AppleScript dictionary (`id of tab`).
  // Use as React key, optimistic-state key, and the handle passed back to AS.
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isPinned: boolean;
}

export interface AsideTabSnapshot {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
  windowId: string;
  windowIndex: number;
  tabIndex: number;
  windowMode: string;
}

export interface LiveTab extends AsideTabSnapshot {
  isPinned: boolean;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  folder?: string;
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  lastVisitedAt: string;
}

export interface Suggestion {
  id: string;
  query: string;
  url: string;
  type: "search" | "url";
}
