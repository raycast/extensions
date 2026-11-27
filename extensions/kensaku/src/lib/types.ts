export type ExtensionPreferences = Preferences;

export type MatchType = "FileName" | "Content" | "ContentFolded" | "Semantic" | "Both" | string;

export interface SearchResultItem {
  path: string;
  score: number;
  snippet: string;
  snippet_truncated?: boolean;
  match_type: MatchType;
  size: number;
  modified: number;
}

export interface SearchResponse {
  results: SearchResultItem[];
  returned: number;
  total: number;
  total_is_lower_bound?: boolean;
  mode: "ranked" | "exhaustive" | string;
  page_size: number;
  next_cursor: string | null;
  has_more: boolean;
  cursor_limit_reached?: boolean;
  token_budget?: number;
  as_of: number;
}

export interface SnippetResponse {
  path: string;
  line_start: number;
  line_end: number;
  text: string;
  truncated: boolean;
  token_budget: number;
}

export interface SymbolHit {
  path: string;
  name: string;
  kind: string;
  line_start: number;
  line_end: number;
  signature: string;
}

export interface SymbolSearchResponse {
  query: string;
  language: string | null;
  symbols: SymbolHit[];
  returned: number;
  total: number;
  files_parsed: number;
  has_more: boolean;
  as_of: number;
}

export interface IndexStateResponse {
  files: number | null;
  dirs: number | null;
  content_docs: number | null;
  semantic_units: number | null;
  index_bytes: number | null;
  model_id: number | null;
  active_model_id: number | null;
  model_name: string | null;
  model_real: boolean | null;
  roots: string[] | null;
  last_reconcile: number | null;
  phase: string | null;
  is_indexing: boolean | null;
  paused: boolean | null;
  files_indexed?: number | null;
  content_indexed?: number | null;
  extract_done?: number | null;
  extract_total?: number | null;
  as_of: number;
}

export interface HealthPayload {
  ok: boolean;
  daemon: boolean;
  protocol_version?: number | null;
  db: boolean;
  index: boolean;
  model: boolean;
  watcher_ok: boolean;
  error: string | null;
  state?: Partial<IndexStateResponse> | null;
}

export interface HttpHealthResponse {
  ok: boolean;
  health: HealthPayload;
  as_of: number;
}
