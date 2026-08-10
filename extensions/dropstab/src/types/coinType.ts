// src/commands/types.ts
export interface SearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
}

export interface SearchResult {
  icon: string;
  price: string;
  id: string;
  symbol: string;
  name: string;
  url: string;
  twitter: string;
  website: string;
  rank: string;
  marketCap: string;
  network?: string;
}
