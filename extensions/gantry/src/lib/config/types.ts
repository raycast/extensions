export type LLMProvider = "anthropic" | "google" | "openai";

export interface LLMModelOption {
  id: string;
  label: string;
  provider: LLMProvider;
}

export interface GantryConfig {
  llm: {
    apiKeys: Partial<Record<LLMProvider, string>>;
    selectedModel: string | null;
  };
}
