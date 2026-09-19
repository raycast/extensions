import { ModelCapability } from "../enum";
import { OllamaServerAuthorizationMethod } from "./enum";

export type ThinkingEffort = false | "low" | "medium" | "high";

/** Connection data for an Ollama instance used only for model lifecycle actions. */
export interface OllamaServer {
  url: string;
  auth?: {
    mode: OllamaServerAuthorizationMethod;
    username?: string;
    password?: string;
    token?: string;
  };
}

export interface OllamaModelDetails {
  parent_model?: string;
  format: string;
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: OllamaModelDetails;
}

export interface OllamaRunningModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  details: OllamaModelDetails;
  expires_at: string;
  size_vram: number;
  context_length: number;
}

export interface OllamaModelInfo {
  license?: string;
  modelfile?: string;
  parameters?: string;
  template?: string;
  system?: string;
  capabilities?: ModelCapability[];
  details?: OllamaModelDetails;
}

export interface OllamaPullProgress {
  status: string;
  total?: number;
  completed?: number;
}
