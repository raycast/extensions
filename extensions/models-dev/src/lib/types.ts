// Raw API response types (as returned from models.dev)
export interface RawApiResponse {
  [providerId: string]: RawProvider;
}

export interface RawProvider {
  id: string;
  name: string;
  npm: string;
  env: string[];
  doc: string;
  api?: string;
  models: Record<string, RawModel>;
}

export interface RawModel {
  id: string;
  name: string;
  family?: string;
  attachment: boolean;
  reasoning: boolean;
  tool_call: boolean;
  structured_output?: boolean;
  temperature?: boolean;
  knowledge?: string;
  release_date?: string;
  last_updated?: string;
  open_weights?: boolean;
  status?: "alpha" | "beta" | "deprecated";
  interleaved?: { field: string };
  modalities: {
    input: Modality[];
    output: Modality[];
  };
  cost?: ModelCost;
  limit?: ModelLimit;
}

// Modality types
export type InputModality = "text" | "image" | "audio" | "video" | "pdf";
export type OutputModality = "text" | "audio";
export type Modality = InputModality | OutputModality;

// Pricing structure
export interface ModelCost {
  input: number;
  output: number;
  cache_read?: number;
  cache_write?: number;
  reasoning?: number;
  input_audio?: number;
  output_audio?: number;
}

// Token limits
export interface ModelLimit {
  context: number;
  input?: number;
  output?: number;
}

// Transformed/flattened types for use in the extension

export interface Provider {
  id: string;
  name: string;
  doc: string;
  modelCount: number;
  logo: string;
}

export interface Model {
  id: string;
  name: string;
  family?: string;
  providerId: string;
  providerName: string;
  providerLogo: string;
  providerDoc?: string;

  // Capabilities
  attachment: boolean;
  reasoning: boolean;
  tool_call: boolean;
  structured_output: boolean;
  temperature: boolean;

  // Metadata
  knowledge?: string;
  release_date?: string;
  last_updated?: string;
  open_weights: boolean;
  status?: "alpha" | "beta" | "deprecated";

  // Modalities
  modalities: {
    input: InputModality[];
    output: OutputModality[];
  };

  // Pricing (per million tokens, USD)
  cost?: ModelCost;

  // Limits
  limit?: ModelLimit;
}

// Transformed data structure
export interface ModelsData {
  providers: Provider[];
  models: Model[];
}

// Capability type for filtering
export type Capability =
  | "reasoning"
  | "tool_call"
  | "vision"
  | "audio"
  | "video"
  | "pdf"
  | "structured_output"
  | "open_weights";
