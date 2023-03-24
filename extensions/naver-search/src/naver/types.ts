export const HISTORY_KEY = "history";

export type autoCompleteItem = [string, number];

export interface SearchResult {
  id: string;
  description?: string;
  query: string;
  url: string;
  isNavigation?: boolean;
  isHistory?: boolean;
}

export interface Preferences {
  rememberSearchHistory: boolean;
}
