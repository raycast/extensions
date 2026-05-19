export interface Abilities {
  temperature?: { supported: boolean };
  vision?: { supported: boolean };
  system_message?: { supported: boolean };
  tools?: { supported: boolean };
  reasoning_effort?: { supported: boolean };
}

export interface Model {
  id: string;
  name: string;
  provider?: string;
  description?: string;
  context: number;
  abilities?: Abilities;
  enabled?: boolean;
}

export interface AdditionalParameters {
  return_images?: boolean;
  web_search_options?: {
    search_context_size?: "low" | "medium" | "high";
  };
}

export interface Provider {
  id: string;
  name: string;
  base_url: string;
  api_keys?: Record<string, string>;
  additional_parameters?: AdditionalParameters;
  models: Model[];
  enabled?: boolean;
}

export interface ProvidersConfig {
  providers: Provider[];
}

export interface DisabledConfig {
  providers: Provider[];
  modelsByProvider: Record<string, Model[]>;
}

export interface RemoteModel {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
}

export interface RemoteModelsResponse {
  data: RemoteModel[];
}
