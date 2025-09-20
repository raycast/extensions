export const HISTORY_KEY = "history";

export interface BraveResult {
  is_entity: boolean;
  q: string;
  name?: string;
  desc?: string;
  img?: string;
}

export interface SearchResult {
  id: string;
  description?: string;
  query: string;
  url: string;
  isNavigation?: boolean;
  isHistory?: boolean;
}
