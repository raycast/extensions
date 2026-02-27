import { getPreferenceValues } from "@raycast/api";
import type { GantryConfig } from "../lib/config/types";
import { AVAILABLE_MODELS } from "../lib/config/models";

export function getConfig(): GantryConfig {
  const prefs = getPreferenceValues<Preferences>();

export function getConfig(): GantryConfig {
  const prefs = getPreferenceValues<GantryPreferences>();

  return {
    llm: {
      apiKeys: {
        ...(prefs.anthropicApiKey ? { anthropic: prefs.anthropicApiKey } : {}),
        ...(prefs.googleApiKey ? { google: prefs.googleApiKey } : {}),
        ...(prefs.openaiApiKey ? { openai: prefs.openaiApiKey } : {}),
      },
      selectedModel: prefs.llmModel || null,
    },
  };
}

export function getShowAppleServices(): boolean {
  const prefs = getPreferenceValues<GantryPreferences>();
  return prefs.showAppleServices;
}

export function isLLMConfigured(): boolean {
  const config = getConfig();
  if (!config.llm.selectedModel) return false;
  const model = AVAILABLE_MODELS.find((m) => m.id === config.llm.selectedModel);
  if (!model) return false;
  return Boolean(config.llm.apiKeys[model.provider]);
}
