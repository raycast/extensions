export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
}

export interface OllamaModelsResponse {
  models: OllamaModel[];
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export const STORAGE_KEYS = {
  OLLAMA_URL: "ollama-url",
  DEFAULT_MODEL: "default-model",
  SETTINGS_UPDATED: "settings-updated",
} as const;
