import { getPreferenceValues } from "@raycast/api";
import { LLMProviderPreferences } from "../types";
import { DEFAULT_OPENAI_EXECUTION_MODEL } from "shared/constants";

export function resolveLlmApiProviderPreferences(): LLMProviderPreferences {
  const preferences = getPreferenceValues();

  const apiProviderType = preferences.apiProviderType ?? "openai";
  const apiKey = preferences.apiKey?.trim() ?? "";
  const apiBaseUrl = preferences.apiBaseUrl?.trim() ?? undefined;
  const defaultHeaders = preferences.defaultHeaders?.trim() ?? undefined;
  let model = preferences.model?.trim() ?? undefined;

  if (!model && apiProviderType === "openai") {
    model = DEFAULT_OPENAI_EXECUTION_MODEL;
  }

  return {
    apiKey,
    apiProviderType,
    apiBaseUrl,
    defaultHeaders,
    model,
  };
}
