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
  id: string;
  name: string;
  description: string;
  organization: Organization | null;
  aliases: string[];
  lifecycle: ModelLifecycle;
  modalities: ModelModalities;
  limits: ModelLimits;
  capabilities: ModelCapabilities;
  availability: ModelAvailability;
  pricing: Record<string, unknown>;
  offers: ModelOffer[];
}

export interface Organization {
  id: string;
  name: string | null;
  color: string | null;
}

export interface ModelLifecycle {
  status: string;
  released_at: string | null;
  deprecated_at: string | null;
  retires_at: string | null;
  replacement_id: string | null;
  message: string | null;
}

export interface ModelModalities {
  input: string[];
  output: string[];
}

export interface ModelLimits {
  input_tokens: number | null;
  output_tokens: number | null;
}

export interface ModelCapabilities {
  endpoints: string[];
  parameters: string[];
  parameter_details: Record<string, unknown>;
}

export interface ModelAvailability {
  status: string;
  provider_count: number;
  active_provider_count: number;
  coming_soon_provider_count: number;
  inactive_provider_count: number;
}

export interface ModelOffer {
  [key: string]: unknown;
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

// Organisation Types
// API Response Types
export interface ModelsResponse {
  ok: boolean;
  availability_mode: string;
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
