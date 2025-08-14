export interface SearchParams {
  query: string;
  owner: string;
  search_on: ("title" | "headnote" | "full_text")[];
  search_id?: string;
  next_page_token?: string;
  sort_by_field?: ("score" | "ranking_ijr" | "order_date" | "juit_id")[];
  sort_by_direction?: ("asc" | "desc")[];
  disable_synonym_on?: ("title" | "headnote" | "full_text")[];
  court_code?: string[];
  degree?: string[];
  process_origin_state?: string[];
  district?: string[];
  document_matter_list?: string[];
  process_class_name_list?: string[];
  judgment_body?: string[];
  trier?: string[];
  document_type?: string[];
  justice_type?: string[];
  order_date?: string[];
  judgment_date?: string[];
  publication_date?: string[];
  release_date?: string[];
  signature_date?: string[];
}

export interface SearchInfo {
  search_id: string | null;
  elapsed_time_in_ms: number;
}

export interface Pagination {
  next_page_token: string | null;
  total: number;
  size: number;
}

export interface Jurisprudence {
  id: string;
  juit_id: string;
  title: string;
  headnote: string | null;
  full_text: string | null;
  cnj_unique_number: string | null;
  order_date: string | null;
  judgment_date: string | null;
  publication_date: string | null;
  release_date: string | null;
  signature_date: string | null;
  court_code: string;
  degree: string | null;
  process_origin_state: string | null;
  district: string | null;
  document_matter_list: string[] | null;
  process_class_name_list: string[] | null;
  judgment_body: string | null;
  trier: string | null;
  document_type: string | null;
  justice_type: string | null;
  rimor_url: string;
}

export interface JUITApiResponse {
  total: number;
  size: number;
  next_page_token: string | null;
  search_info: SearchInfo;
  items: Jurisprudence[];
}

export interface ApiError {
  status: number;
  error: string;
  message: string;
  details?: {
    trace_id: string;
    short_message: string;
    long_message: string;
  };
}

export interface SearchFilters {
  searchFields: ("title" | "headnote" | "full_text")[];
  courts: string[];
  sortBy: "juridical_relevance" | "relevance" | "newest" | "oldest";
  dateFrom?: string;
  dateTo?: string;
  degree?: string;
}

export interface ExtendedPreferences {
  apiUsername: string;
  apiPassword: string;
  apiOwner: string;
  anthropicApiKey?: string;
  anthropicModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  mistralApiKey?: string;
  mistralModel?: string;
  defaultLlm?: string;
}
