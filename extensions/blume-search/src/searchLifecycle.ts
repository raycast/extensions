import type { GlobalSearchResult } from "./protocol.ts";

export interface SearchState {
  results: GlobalSearchResult[];
  isLoading: boolean;
  error: string | null;
}

export function searchStateForApplicationChange(): SearchState {
  return { results: [], isLoading: true, error: null };
}
