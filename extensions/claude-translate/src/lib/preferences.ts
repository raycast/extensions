import { getPreferenceValues } from "@raycast/api";
import { isTargetLanguage, type TargetLanguage } from "./languages";

export type ClaudeModel = "claude-opus-5" | "claude-sonnet-5" | "claude-haiku-4-5";

export interface TranslatePreferences {
  anthropicApiKey: string;
  model: ClaudeModel;
  targetLanguage: TargetLanguage;
}

function isClaudeModel(value: string): value is ClaudeModel {
  return value === "claude-opus-5" || value === "claude-sonnet-5" || value === "claude-haiku-4-5";
}

export function getTranslatePreferences(): TranslatePreferences {
  const preferences = getPreferenceValues<Preferences>();
  const model = preferences.model ?? "";
  const targetLanguage = preferences.targetLanguage ?? "";

  return {
    anthropicApiKey: preferences.anthropicApiKey.trim(),
    model: isClaudeModel(model) ? model : "claude-opus-5",
    targetLanguage: isTargetLanguage(targetLanguage) ? targetLanguage : "English",
  };
}
