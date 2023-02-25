export const HISTORY_KEY = "history";

export interface SearchResult {
  id: string;
  description?: string;
  query: string;
  url: string;
  isHistory?: boolean;
}

export interface Preferences {
  rememberSearchHistory: boolean;
}
