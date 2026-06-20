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
  interactions: number;
}

export type SearchMode =
  | "unified"
  | "recent"
  | "indexing"
  | "too_short"
  | "error"
  | "stale";

export interface SearchResponse {
  query: string;
  mode: SearchMode;
  elapsed_ms: number;
  total_results: number;
  results: SearchResult[];
  error?: string;
  hint?: string;
  message?: string;
  sync_skipped?: boolean;
  warning?: string;
}
