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
