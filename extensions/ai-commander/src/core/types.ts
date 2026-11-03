/**
 * Shared domain types. This module has no runtime dependencies so that every
 * layer (providers, catalog, prompts, UI) can import it freely.
 */

export type ProviderId = "anthropic" | "openai" | "gemini" | "openrouter";

export type ReasoningLevel = "default" | "off" | "low" | "medium" | "high";

export type CreativityLevel = "default" | "none" | "low" | "medium" | "high" | "maximum";

export type OutputMode = "preview" | "replace" | "copy" | "insertAfter";

export type PrivacyOverride = "default" | "strict";

/** A model is addressed by its provider plus the provider's own model ID. */
export interface ModelRef {
  provider: ProviderId;
  modelId: string;
}

/** A saved prompt. Prompts are data: new use cases never require code. */
export interface PromptDef {
  /** UUID, or a fixed ID for bundled examples. Stable because quicklinks store it. */
  id: string;
  name: string;
  /** Key of the Raycast `Icon` enum, for example "Text". */
  icon?: string;
  /** Template with Raycast-compatible placeholders, see `src/prompts/template`. */
  template: string;
  /** Empty means the global default model. */
  model?: ModelRef;
  /** OpenRouter only: overrides the global privacy mode for this prompt. */
  privacy?: PrivacyOverride;
  reasoning: ReasoningLevel;
  creativity: CreativityLevel;
  tags: string[];
  output: OutputMode;
  highlightChanges: boolean;
  enabled: boolean;
  lastUsedAt?: number;
  createdAt: number;
  updatedAt: number;
}

/** A reusable text block, referenced as `{snippet name="…"}`. */
export interface TextSnippet {
  id: string;
  name: string;
  text: string;
  updatedAt: number;
}

export interface DefaultModel {
  ref: ModelRef;
  reasoning: ReasoningLevel;
}

export interface OpenRouterPrivacy {
  /** `strict` allows only zero-data-retention endpoints without data collection. */
  mode: "standard" | "strict";
  /** Hosts to exclude, for example `["deepseek"]`. */
  ignoreProviders: string[];
}

/** Connection details of one provider. Each provider is one profile, adapters are shared. */
export interface ProviderProfile {
  id: ProviderId;
  adapter: "anthropic" | "openai-compatible";
  baseUrl: string;
  reasoningStyle: "anthropic" | "openai" | "gemini" | "openrouter";
}

export interface ModelPricing {
  inputPerMTok: number;
  outputPerMTok: number;
}

export interface CatalogEntry {
  ref: ModelRef;
  displayName: string;
  /** Group in the model dropdown: "Claude", "GPT", "Gemini", "DeepSeek", … */
  family: string;
  supportsReasoning?: boolean;
  supportsTemperature?: boolean;
  /** Only known for OpenRouter models. */
  pricing?: ModelPricing;
  contextLength?: number;
  maxOutputTokens?: number;
}

/** OpenRouter's `provider` request object. */
export interface OpenRouterProviderOptions {
  zdr?: boolean;
  data_collection?: "deny";
  ignore?: string[];
}

export interface ChatRequest {
  model: string;
  system: string;
  /** Refinement builds a new single request, there is no multi-turn history. */
  user: string;
  /** Already resolved: `default` means no parameter is sent. */
  reasoning: ReasoningLevel;
  /** Only set when the model accepts it. */
  temperature?: number;
  /** The model's limit, capped. Undefined when unknown: only Anthropic requires a value and uses a default then. */
  maxOutputTokens?: number;
  openRouterProvider?: OpenRouterProviderOptions;
  signal: AbortSignal;
}

export interface TokenUsage {
  input: number;
  output: number;
}

export type FinishReason = "stop" | "length" | "refusal" | "other";

export type StreamEvent =
  { type: "text"; text: string } | { type: "done"; finishReason: FinishReason; usage?: TokenUsage };

/** A model as reported by a provider, before catalog filtering and grouping. */
export interface RawModel {
  id: string;
  name?: string;
  contextLength?: number;
  maxOutputTokens?: number;
  supportsReasoning?: boolean;
  supportsTemperature?: boolean;
  pricing?: ModelPricing;
}

export interface ChatAdapter {
  stream(profile: ProviderProfile, apiKey: string, req: ChatRequest): AsyncIterable<StreamEvent>;
  listModels(profile: ProviderProfile, apiKey: string, signal?: AbortSignal): Promise<RawModel[]>;
}
