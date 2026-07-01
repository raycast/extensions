export type DefaultCopyBehavior = "formatted" | "unformatted";

export type OpenRouterDataCollection = "allow" | "deny";

export interface OpenRouterProviderPreferences {
  allow_fallbacks: boolean;
  data_collection: OpenRouterDataCollection;
}

export interface OpenRouterRequestParameters {
  max_tokens: number;
  temperature: number;
}

export const DEFAULT_OPENROUTER_PROVIDER: OpenRouterProviderPreferences = {
  allow_fallbacks: true,
  data_collection: "deny",
};

export const DEFAULT_OPENROUTER_PARAMETERS: OpenRouterRequestParameters = {
  max_tokens: 8192,
  temperature: 0,
};

export interface OcrSetupConfig {
  apiKey: string;
  model: string;
  defaultCopyBehavior: DefaultCopyBehavior;
  provider: OpenRouterProviderPreferences;
  parameters: OpenRouterRequestParameters;
}

export interface OcrResult {
  text: string;
  model: string;
  createdAt: Date;
}

export type OcrErrorKind =
  | "capture_canceled"
  | "capture_failed"
  | "configuration"
  | "network"
  | "provider"
  | "empty"
  | "unknown";

export interface OcrError {
  kind: OcrErrorKind;
  message: string;
  retryable: boolean;
}
