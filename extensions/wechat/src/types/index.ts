export interface SearchResult {
  icon: { path: string };
  title: string;
  subtitle: string;
  arg: string;
  valid: number;
  url: string;
}

export interface SearchState {
  items: SearchResult[];
  recentContacts: SearchResult[];
  isLoading: boolean;
  searchText: string;
}
