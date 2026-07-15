// API Response Types
export interface APIResponse<T> {
  ok: boolean;
  error?: string;
  message?: string;
  limit?: number;
  offset?: number;
  total?: number;
  data?: T;
}

// Model Types
export interface Model {
  model_id: string;
  name: string | null;
  release_date: string | null;
  status: string | null;
  organisation_id: string | null;
  organisation_name: string | null;
  organisation_colour: string | null;
  aliases: string[];
  endpoints: string[];
  input_types: string[];
  output_types: string[];
  providers: ProviderInfo[];
  pricing?: ModelPricing | null;
  top_provider?: ModelTopProvider | null;
}

export interface ProviderInfo {
  api_provider_id: string;
  params: string[];
}

export interface Organisation {
  organisation_id: string;
  name: string | null;
  country_code: string | null;
  description: string | null;
  colour: string | null;
}

export interface Provider {
  api_provider_id: string;
  api_provider_name: string | null;
  description: string | null;
  link: string | null;
  country_code: string | null;
}

export interface ModelPricing {
  prompt?: string | null;
  completion?: string | null;
  request?: string | null;
  image?: string | null;
}

export interface ModelTopProvider {
  context_length?: number | null;
  max_completion_tokens?: number | null;
}

// Organisation Types
// API Response Types
export interface ModelsResponse {
  ok: boolean;
  limit: number;
  offset: number;
  total: number;
  models: Model[];
}

// Filter Types
export interface ModelFilters {
  endpoints?: string[];
  organisation?: string[];
  input_types?: string[];
  output_types?: string[];
  params?: string[];
}

// Preferences
export interface Preferences {
  apiKey: string;
  apiUrl?: string;
}
