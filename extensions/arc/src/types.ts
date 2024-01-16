export type HistoryEntry = {
  id: number;
  url: string;
  title: string;
  lastVisitedAt: string;
};

export type Tab = {
  id: string;
  url: string;
  title: string;
  location: TabLocation;
};

export type TabLocation = "topApp" | "pinned" | "unpinned";

export type Space = {
  id: string;
  title?: string;
};

export type NewTabSearchConfig = {
  search: string;
};

export type NewTabSearchConfigs = {
  google: NewTabSearchConfig;
  duckduckgo: NewTabSearchConfig;
  bing: NewTabSearchConfig;
  yahoo: NewTabSearchConfig;
  ecosia: NewTabSearchConfig;
};

export type SearchConfig = {
  search: string;
  suggestions: string | null;
  suggestionParser: ((json: any, suggestions: Suggestion[]) => void) | null;
};

export type SearchConfigs = {
  google: SearchConfig;
  duckduckgo: SearchConfig;
  bing: SearchConfig;
  yahoo: SearchConfig;
  ecosia: SearchConfig;
};

export type Suggestion = {
  id: string;
  query: string;
  url: string;
};

export type URLArguments = {
  url?: string;
};
