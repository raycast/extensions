/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

export const PROVIDER_ICON_NAMES = [
  "openai",
  "gemini",
  "deepseek",
  "openrouter",
  "siliconflow",
  "zhipu",
  "kimi",
  "minimax",
  "mimo",
  "raycast",
] as const;

export type ProviderIconName = (typeof PROVIDER_ICON_NAMES)[number];

export type ProviderIconConfig =
  | { kind: "preset"; name: ProviderIconName }
  | { kind: "remote"; url: string }
  | { kind: "favicon"; website?: string }
  | { kind: "initials" };

export type WordResultMode = "translation" | "dictionary";

interface AIProviderProfileBase {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  icon: ProviderIconConfig;
  wordResultMode: WordResultMode;
}

export interface RaycastAIProfile extends AIProviderProfileBase {
  adapter: "raycast-ai";
  model: string;
}

export type TokenLimitMode = "max-tokens" | "max-completion-tokens";
export type JSONOutputMode = "prompt" | "json-object";

export interface OpenAICompatibleProfile extends AIProviderProfileBase {
  adapter: "openai-compatible";
  endpoint: string;
  website?: string;
  model: string;
  apiKey: string;
  tokenLimitMode: TokenLimitMode;
  jsonOutputMode: JSONOutputMode;
}

export type AIProviderProfile = RaycastAIProfile | OpenAICompatibleProfile;

export interface StoredAIProviderStateV1 {
  version: 1;
  profiles: AIProviderProfile[];
  providerOrder?: string[];
  migration?: {
    legacyPreferencesImported: boolean;
  };
}
