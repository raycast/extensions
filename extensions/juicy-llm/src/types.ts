export const PROVIDERS = [
  "openai",
  "anthropic",
  "google",
  "ollama",
  "openrouter",
] as const;
export type Provider = (typeof PROVIDERS)[number];

export function isProvider(value: string): value is Provider {
  return (PROVIDERS as readonly string[]).includes(value);
}

export const PROVIDER_LABELS: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google AI",
  ollama: "Ollama",
  openrouter: "OpenRouter",
};

export type CreateOrUpdate<T extends { id: string }> = Omit<T, "id"> & {
  id?: string;
};

export interface ProviderConfig {
  provider: Provider;
  apiKey?: string;
  baseUrl?: string;
  enabled: boolean;
}

export interface ProviderModel {
  id: string;
  name: string;
}

export interface ModelPreset {
  id: string;
  name: string;
  provider: Provider;
  model: string;
  temperature: number;
  maxTokens?: number;
}

export interface CustomPrompt {
  id: string;
  name: string;
  prompt: string;
  modelPresetId: string;
  icon?: string;
}

export const COMMAND_TYPES = [
  "translate",
  "fix-spelling",
  "custom-prompt",
] as const;
export type CommandType = (typeof COMMAND_TYPES)[number];

export interface HistoryEntry {
  id: string;
  commandType: CommandType;
  commandLabel: string;
  originalText: string;
  resultText: string;
  modelPresetId: string;
  timestamp: number;
}

type CommandName = "translate" | "fixspelling";
export type CommandConfig = Partial<{
  [K in CommandName as `${K}_model_preset_id`]: string;
}>;

export interface Preferences {
  my_language: string;
  foreign_language: string;
}
