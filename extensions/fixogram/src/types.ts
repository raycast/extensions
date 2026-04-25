export type Provider =
  | "anthropic"
  | "openai"
  | "openrouter"
  | "google"
  | "groq"
  | "ollama";

export interface Preferences {
  provider: Provider;
  apiKey: string;
  useRaycastAI: boolean;
  model?: string;
  userInstruction?: string;
  customBaseURL?: string;
}
