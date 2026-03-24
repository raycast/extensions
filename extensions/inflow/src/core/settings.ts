// Settings layer: persists user configuration in Raycast's encrypted LocalStorage.
import { LocalStorage } from "@raycast/api";
import { normalizeStoredLanguageValue } from "./languages";
import { SETTINGS_STORAGE_KEY } from "./storage";

export interface ProviderConfig {
  apiKey?: string;
  aiModel?: string;
  apiEndpoint?: string;
  modelSelectionMode?: "preset" | "custom";
}

// Flat settings used by the command pipeline
export interface AppSettings {
  aiProvider: string;
  apiKey?: string;
  aiModel?: string;
  apiEndpoint?: string;
  customInstructions?: string;
  personalContext?: string;
  defaultLanguage?: string;
  expressionLanguage?: string;
  editableTextHandling?: "inline" | "panel";
}

// Storage format with per-provider independent configs
export interface StoredSettings {
  aiProvider: string;
  providers: Record<string, ProviderConfig>;
  customInstructions?: string;
  personalContext?: string;
  defaultLanguage?: string;
  expressionLanguage?: string;
  editableTextHandling?: "inline" | "panel";
}

const DEFAULT_STORED: StoredSettings = {
  aiProvider: "raycast",
  providers: {},
  customInstructions: "",
  defaultLanguage: "",
  expressionLanguage: "English (US)",
  editableTextHandling: "panel",
};

export async function getStoredSettings(): Promise<StoredSettings> {
  try {
    const cached = await LocalStorage.getItem<string>(SETTINGS_STORAGE_KEY);
    if (cached) {
      return { ...DEFAULT_STORED, ...JSON.parse(cached) };
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  return { ...DEFAULT_STORED };
}

export async function saveStoredSettings(
  settings: StoredSettings,
): Promise<void> {
  await LocalStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

// Flat settings for the command pipeline (resolves active provider's config)
export async function getAppSettings(): Promise<AppSettings> {
  const stored = await getStoredSettings();
  const config = stored.providers[stored.aiProvider] || {};
  return {
    aiProvider: stored.aiProvider,
    apiKey: config.apiKey || "",
    aiModel: config.aiModel || "",
    apiEndpoint: config.apiEndpoint || "",
    customInstructions: stored.customInstructions || "",
    personalContext: stored.personalContext || "",
    defaultLanguage: normalizeStoredLanguageValue(stored.defaultLanguage || ""),
    expressionLanguage: normalizeStoredLanguageValue(
      stored.expressionLanguage || "English (US)",
    ),
    editableTextHandling: stored.editableTextHandling || "panel",
  };
}
