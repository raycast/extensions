export type ApiRegion = "global" | "china";

export interface Preferences {
  apiKey: string;
  apiRegion: ApiRegion;
}

export interface ToolParameter {
  name: string;
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  required: boolean;
  description?: string;
  enum?: string[];
}

export interface ToolInfo {
  tool_id: string;
  name?: string;
  description?: string;
  capability?: string;
  provider_name?: string;
  provider_website_url?: string;
  docs_url?: string;
  params?: ToolParameter[];
  examples?: { sample_parameters?: Record<string, unknown> };
  expected_cost?: string | number | null;
  billing_rule?: Record<string, unknown>;
  stats?: {
    avg_execution_time_ms?: number;
    success_rate?: number;
  };
  final_score?: number;
  why_recommended?: string;
  reliability?: string;
  cost_class?: string;
  region?: string;
}

export interface SearchResponse {
  query?: string;
  search_id: string;
  total?: number;
  results: ToolInfo[];
  elapsed_time_ms?: number;
  remaining_credits?: number;
  error_message?: string | null;
}

export interface ProbeViolation {
  param?: string | null;
  type?: string;
  message: string;
}

export interface ProbeResponse {
  schema?: {
    valid: boolean;
    violations?: ProbeViolation[] | null;
    note?: string | null;
  };
  quote?: {
    estimate_credits?: number | null;
    currency?: string;
    exact?: boolean;
    basis?: string | null;
  };
  coverage?: { verdict?: string; reason?: string };
  sample?: { verdict?: string; reason?: string };
}

export interface ExecuteResponse {
  execution_id: string;
  tool_id?: string;
  parameters?: Record<string, unknown>;
  result?: unknown;
  success: boolean;
  error_message?: string | null;
  execution_time?: number;
  elapsed_time_ms?: number;
  cost?: number;
  billing?: {
    requested_amount_credits?: number | null;
    summary?: string | null;
    [key: string]: unknown;
  };
  remaining_credits?: number;
  created_at?: string;
}
