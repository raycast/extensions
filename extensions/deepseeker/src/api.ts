import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

/**
 * Get preference values from Raycast API
 */
const preferences = getPreferenceValues();

/**
 * Initialize OpenAI client with DeepSeek API compatibility
 * Uses baseURL from preferences or falls back to DeepSeek API endpoint
 */
export const openai = new OpenAI({
  baseURL: preferences.baseurl || "https://api.deepseek.com/v1",
  apiKey: preferences.apikey,
});

/**
 * Model selection logic
 * Uses custom model if provided and valid, otherwise falls back to global model setting
 */
/**
 * DeepSeek no longer accepts its older model IDs. Preferences saved before the
 * dropdown changed can still hold them, so map them to the current models.
 */
const legacyModels: Record<string, string> = {
  "deepseek-chat": "deepseek-flash",
  "deepseek-v4-flash": "deepseek-flash",
  "deepseek-reasoner": "deepseek-v4-pro",
  "deepseek-r1": "deepseek-v4-pro",
};

export function normalizeModel(model: string): string {
  return legacyModels[model] ?? model;
}

const customModel = preferences.custom_model;
const isCustomModelValid = Boolean(customModel && customModel.length > 0);
const globalModel = normalizeModel(isCustomModelValid ? customModel : preferences.model);

// Log the selected model for debugging purposes
console.log(`Using model: ${globalModel}`);

export { globalModel };
