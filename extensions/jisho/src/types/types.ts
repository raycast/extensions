export interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

export interface SearchResult {
  id: string;
  slug: string;
  kanji: string;
  reading: string;
  definition: [string];
  url: string;
}

export interface Preferences {
  "save-to-history-on-unmount": boolean;
}

export type SearchHistoryItem = (SearchResult & { type: "result" }) | { type: "query"; query: string };

export type SearchHistory = SearchHistoryItem[];
