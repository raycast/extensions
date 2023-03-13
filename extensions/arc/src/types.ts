export type HistoryEntry = {
  id: number;
  url: string;
  title: string;
  lastVisitedAt: string;
};

export type Tab = {
  windowId: number;
  tabId: number;
  url: string;
  title: string;
  location: TabLocation;
};

export type TabLocation = "topApp" | "pinned" | "unpinned";

export type Space = {
  id: string;
  title?: string;
};

export type NewTabPreferences = {
  url: string;
};

export type SearchArcPreferences = {
  sorting: "tabsHistorySuggestions" | "historyTabsSuggestions";
  showFavorites: boolean;
  showPinnedTabs: boolean;
  showUnpinnedTabs: boolean;
  showHistory: boolean;
  showSuggestions: boolean;
};

export type Suggestion = {
  id: string;
  query: string;
  url: string;
};

export type NewLittleArcArguments = {
  url?: string;
};
