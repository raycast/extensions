export type HistoryEntry = {
  id: number;
  url: string;
  title: string;
  lastVisitedAt: string;
  profileName: string | undefined;
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
  isActive: boolean;
};

export type Download = {
  id: number;
  current_path: string;
  target_path: string;
  tab_url: string;
  download_time: string;
};

export type NewTabSearchConfigs = {
  google: string;
  duckduckgo: string;
  bing: string;
  yahoo: string;
  ecosia: string;
  kagi: string;
  unduck: string;
};

export type SearchConfig = {
  search: string;
  suggestions: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suggestionParser: ((json: any, suggestions: Suggestion[]) => void) | null;
};

export type SearchConfigs = {
  google: SearchConfig;
  duckduckgo: SearchConfig;
  bing: SearchConfig;
  yahoo: SearchConfig;
  ecosia: SearchConfig;
  kagi: SearchConfig;
  unduck: SearchConfig;
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

/** Suggestion Parsers */
interface GoogleClientData {
  bpc: boolean;
  tlw: boolean;
}

interface GoogleSuggestItem {
  "google:clientdata": GoogleClientData;
  "google:suggesttype": string[];
  "google:verbatimrelevance": number;
}

export type GoogleSuggestionParser = [string, string[], string[], string[], GoogleSuggestItem];
export type EcosiaSuggestionParser = [string, string[]];
export type KagiSuggestionParser = [string, string[]];
