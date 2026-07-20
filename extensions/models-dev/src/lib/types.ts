import type { Limit, Modalities, ModelCost, ModelFamily } from "@opencode-ai/models";

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
  description: string;
  family?: ModelFamily;
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
  open_weights: boolean;
  status?: "alpha" | "beta" | "deprecated";

  // Modalities
  modalities: Modalities;

  // Pricing (per million tokens, USD)
  cost?: ModelCost;

  // Limits
  limit?: Limit;
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
  | "open_weights"
  | "attachment"
  | "temperature";
