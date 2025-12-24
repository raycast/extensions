export interface SearchData {
  index: {
    searchIndex: string[];
    longSearchIndex: string[];
    info: string[];
  };
}

export interface SearchResult {
  name: string;
  type: string;
  path: string;
  namespace: string;
}
