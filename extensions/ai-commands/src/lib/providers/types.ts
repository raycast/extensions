import { ChatMessage, InferenceMetadata } from "../inference/types";

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
  /** The OpenAI-compatible API is the common inference transport. */
  api_kind?: "openai-compatible";
  /** Enables Ollama-only model lifecycle actions; never changes inference transport. */
  lifecycle?: "ollama";
  api_keys?: Record<string, string>;
  /** Extra request headers for providers that do not use bearer authentication. */
  headers?: Record<string, string>;
  additional_parameters?: Record<string, unknown>;
  models: CustomModel[];
}

/**
 * Common chat message representation across providers
 */
export type UnifiedChatMessage = ChatMessage;

/**
 * Stream event data for chat / completion
 */
export type UnifiedStreamDoneMetadata = InferenceMetadata;
