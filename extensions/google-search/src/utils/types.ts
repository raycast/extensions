export const HISTORY_KEY = "history";

export interface SearchResult {
  id: string;
  description?: string;
  query: string;
  url: string;
  isNavigation?: boolean;
  isHistory?: boolean;
}

export type SearchMode = "default" | "ai";

// [query, suggestions, descriptions, unused, { "google:suggesttype": types, ... }]
export type SuggestResponse = [string, string[]?, string[]?, unknown?, { "google:suggesttype"?: string[] }?];
