export interface SearchResult {
  path: string;
  filename: string;
  score: number;
  match_type: string;
  size_bytes: number | null;
  modified: string;
  file_type: string | null;
  content_snippet: string | null;
  is_dir: boolean;
}

export interface SearchResponse {
  query: string;
  mode: string;
  elapsed_ms: number;
  total_results: number;
  results: SearchResult[];
}
