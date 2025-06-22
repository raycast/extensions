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
const customModel = preferences.custom_model;
const isCustomModelValid = Boolean(customModel && customModel.length > 0);
const globalModel = isCustomModelValid ? customModel : preferences.model;

// Log the selected model for debugging purposes
console.log(`Using model: ${globalModel}`);

export { globalModel };
