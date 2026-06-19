/**
 * TypeScript types for AI providers configuration
 * Based on ai-providers.template.yaml structure
 */

/**
 * Abilities that a model can support
 * All properties are optional
 */
export interface Abilities {
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
 * Model configuration
 */
export interface Model {
  /** Model identifier used by the provider (required) */
  id: string;
  /** Model name visible in Raycast (required) */
  name: string;
  /** Provider key mapping - only required if mapping to a specific api key (optional) */
  provider?: string;
  /** Model description (optional) */
  description?: string;
  /** Context window size - refer to provider's API documentation (required) */
  context: number;
  /** Model abilities - all child properties are optional */
  abilities?: Abilities;
}

/**
 * Provider configuration
 */
export interface Provider {
  /** Provider identifier (required) */
  id: string;
  /** Provider name (required) */
  name: string;
  /** Base URL for the provider API (required) */
  base_url: string;
  /** API keys mapping - optional if authentication is not required (optional) */
  api_keys?: Record<string, string>;
  /** Additional parameters sent to the `/chat/completions` endpoint (optional) */
  additional_parameters?: Record<string, unknown>;
  /** List of models to use with this provider (required, minimum 1) */
  models: Model[];
}
