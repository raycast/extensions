export const HISTORY_KEY = "history";

export interface SearchResult {
  description?: string;
  query: string;
  url: string;
  isNavigation?: boolean;
  isHistory?: boolean;
}
