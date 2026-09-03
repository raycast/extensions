import { OllamaApiChatMessageToolCall } from "../ollama/types";
import { RaycastImage } from "../types";

/**
 * Model abilities matching providers.yaml schema
 */
export interface CustomAbilities {
  temperature?: {
    supported: boolean;
  };
  vision?: {
    supported: boolean;
  };
  system_message?: {
    supported: boolean;
  };
  tools?: {
    supported: boolean;
  };
  reasoning_effort?: {
    supported: boolean;
  };
}

/**
 * Model configuration from providers.yaml
 */
export interface CustomModel {
  id: string;
  name: string;
  provider?: string;
  description?: string;
  context: number;
  abilities?: CustomAbilities;
}

/**
 * Provider configuration from providers.yaml
 */
export interface CustomProvider {
  id: string;
  name: string;
  base_url: string;
  api_keys?: Record<string, string>;
  additional_parameters?: Record<string, unknown>;
  models: CustomModel[];
}

/**
 * Common chat message representation across providers
 */
export interface UnifiedChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  thinking?: string;
  images?: RaycastImage[];
  tool_calls?: OllamaApiChatMessageToolCall[];
  tool_name?: string;
  tool_call_id?: string;
}

/**
 * Stream event data for chat / completion
 */
export interface UnifiedStreamDoneMetadata {
  model?: string;
  created_at?: string;
  done?: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}
