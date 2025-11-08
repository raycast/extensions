// Application constants

export const APP_NAME = "Promptify";
export const APP_VERSION = "1.0.0";

// Validation limits
export const VALIDATION = {
  MIN_PROMPT_LENGTH: 3,
  MAX_PROMPT_LENGTH: 10000,
  MAX_HISTORY_ITEMS: 50,
  MIN_HISTORY_ITEMS: 10,
  MAX_HISTORY_ITEMS_LIMIT: 100,
  MAX_CUSTOM_PRESETS: 20,
  MAX_PRESET_NAME_LENGTH: 100,
  MAX_PRESET_DESCRIPTION_LENGTH: 500,
  MAX_PRESET_TAGS: 10,
  MAX_TAG_LENGTH: 50,
} as const;

// Storage keys
export const STORAGE_KEYS = {
  HISTORY: "promptify.history",
  SETTINGS: "promptify.settings",
  CUSTOM_PRESETS: "promptify.presets.custom",
} as const;

// Default configuration
export const DEFAULTS = {
  OLLAMA_URL: "http://localhost:11434",
  OLLAMA_MODEL: "llama3.2:3b",
  OLLAMA_TIMEOUT: 30000,
  AUTO_PASTE: false,
  SAVE_TO_HISTORY: true,
} as const;

// Provider types
export const PROVIDERS = {
  OLLAMA: "ollama",
  OPENAI: "openai",
} as const;

// Preset types
export const PRESET_TYPES = {
  GENERAL: "general",
  IMAGES: "images",
  CODE: "code",
} as const;

// UI constants
export const UI = {
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  CLIPBOARD_EMPTY: "No text found in clipboard. Copy some text and try again.",
  PROMPT_TOO_SHORT: `Prompt must be at least ${VALIDATION.MIN_PROMPT_LENGTH} characters long.`,
  PROMPT_TOO_LONG: `Prompt cannot exceed ${VALIDATION.MAX_PROMPT_LENGTH} characters.`,
  PROVIDER_UNAVAILABLE: "AI provider is not available. Please check your settings.",
  NETWORK_ERROR: "Network error occurred. Please check your connection.",
  STORAGE_ERROR: "Failed to save data. Please try again.",
  OLLAMA_NOT_RUNNING: "Ollama is not running. Please start Ollama with: ollama serve",
  MODEL_NOT_FOUND: "Model not found. Please check your model name in preferences.",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  COPIED_TO_CLIPBOARD: "Copied to clipboard",
  PASTED_SUCCESSFULLY: "Pasted successfully",
  SAVED_TO_HISTORY: "Saved to history",
  DELETED_FROM_HISTORY: "Deleted from history",
  HISTORY_CLEARED: "History cleared",
  PRESET_SAVED: "Preset saved successfully",
  PRESET_DELETED: "Preset deleted successfully",
} as const;
