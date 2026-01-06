export interface FavoriteModel {
  id: string;
  name: string;
  provider: string;
  model: string;
}

export const DEFAULT_FAVORITE_MODELS: FavoriteModel[] = [
  { id: "1", name: "GPT-4o Mini", provider: "openai", model: "gpt-4o-mini" },
  {
    id: "2",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
  },
  {
    id: "3",
    name: "Gemini 2.0 Flash",
    provider: "gemini",
    model: "gemini-2.0-flash-exp",
  },
  {
    id: "4",
    name: "Qwen Coder (Free)",
    provider: "openrouter",
    model: "qwen/qwen3-coder:free",
  },
  {
    id: "5",
    name: "Llama 3.3 70B",
    provider: "groq",
    model: "llama-3.3-70b-versatile",
  },
  { id: "6", name: "Local Llama", provider: "ollama", model: "llama3.2" },
];
