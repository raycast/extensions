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

export type NewTabSearchConfigs = {
  google: string;
  duckduckgo: string;
  bing: string;
  yahoo: string;
  ecosia: string;
  kagi: string;
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
  kagi: SearchConfig;
};

export type Suggestion = {
  id: string;
  query: string;
  url: string;
};

export type URLArguments = {
  url?: string;
  space?: string;
};

export type WindowArguments = {
  space?: string;
};
