import { Image } from "@raycast/api";

export type LLMApiKey = string;
export type LLMApiProviderType = "openai" | "openai-compatible";

export type LLMProviderPreferences = {
  apiProviderType: LLMApiProviderType;
  apiKey: LLMApiKey;
  apiBaseUrl?: string;
  defaultHeaders?: string;
  model?: string;
};

export type TargetExecutionModeKey = string;

export type TargetExecutionModeInfo = {
  key: TargetExecutionModeKey;
  title: string;
  icon: Image.ImageLike;
  description: string;
  executionContext: string;
};
