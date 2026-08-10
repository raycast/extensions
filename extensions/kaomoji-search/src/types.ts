export interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
  searchText: string;
}

export interface SearchResult {
  id: string;
  name: string;
  description: string;
  category: string;
}
