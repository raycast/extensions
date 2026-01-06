// Provider interface for LLM API integrations

export interface Provider {
  name: string;
  sendMessage(
    prompt: string,
    systemPrompt: string,
    model: string,
    apiKey: string,
  ): Promise<string>;
}

export type ProviderType =
  | "openrouter"
  | "gemini"
  | "openai"
  | "anthropic"
  | "ollama"
  | "groq";

export const PROVIDER_NAMES: Record<ProviderType, string> = {
  openrouter: "OpenRouter",
  gemini: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  ollama: "Ollama (Local)",
  groq: "Groq",
};

export const DEFAULT_MODELS: Record<ProviderType, string> = {
  openrouter: "qwen/qwen3-coder:free",
  gemini: "gemini-2.0-flash-exp",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-20241022",
  ollama: "llama3.2",
  groq: "llama-3.3-70b-versatile",
};
