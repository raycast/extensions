import { getPreferenceValues } from "@raycast/api";
import { DEFAULTS, PROVIDERS } from "./constants";

export interface AppConfig {
  provider: "ollama" | "openai";
  ollama: {
    url: string;
    model: string;
    timeout: number;
  };
  openai: {
    apiKey?: string;
    baseUrl?: string;
    model: string;
  };
  ui: {
    autoPaste: boolean;
    saveToHistory: boolean;
    maxHistoryItems: number;
  };
}

interface RaycastPreferences {
  provider: "ollama" | "openai";
  ollamaUrl: string;
  ollamaModel: string;
  autoPaste: boolean;
  saveToHistory: boolean;
}

export function getConfig(): AppConfig {
  const preferences = getPreferenceValues<RaycastPreferences>();

  return {
    provider: preferences.provider || PROVIDERS.OLLAMA,
    ollama: {
      url: preferences.ollamaUrl || DEFAULTS.OLLAMA_URL,
      model: preferences.ollamaModel || DEFAULTS.OLLAMA_MODEL,
      timeout: DEFAULTS.OLLAMA_TIMEOUT,
    },
    openai: {
      apiKey: undefined, // Will be added when OpenAI provider is implemented
      baseUrl: undefined,
      model: "gpt-3.5-turbo",
    },
    ui: {
      autoPaste: preferences.autoPaste ?? DEFAULTS.AUTO_PASTE,
      saveToHistory: preferences.saveToHistory ?? DEFAULTS.SAVE_TO_HISTORY,
      maxHistoryItems: 100,
    },
  };
}

export function validateConfig(config: AppConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate provider
  if (!config.provider || !Object.values(PROVIDERS).includes(config.provider)) {
    errors.push("Invalid provider selected");
  }

  // Validate Ollama config
  if (config.provider === PROVIDERS.OLLAMA) {
    if (!config.ollama.url) {
      errors.push("Ollama URL is required");
    }

    try {
      new URL(config.ollama.url);
    } catch {
      errors.push("Invalid Ollama URL format");
    }

    if (!config.ollama.model) {
      errors.push("Ollama model is required");
    }
  }

  // Validate OpenAI config (future implementation)
  if (config.provider === PROVIDERS.OPENAI) {
    if (!config.openai.apiKey) {
      errors.push("OpenAI API key is required");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
