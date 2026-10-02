/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { myPreferences } from "@/consts";

import type { LegacyAIProviderConfiguration } from "./legacy";

export function getLegacyAIProviderConfiguration(): LegacyAIProviderConfiguration {
  return {
    openai: {
      enabled: myPreferences.enableOpenAITranslate,
      endpoint: myPreferences.openAIAPIURL.trim(),
      model: myPreferences.openAIModel.trim(),
      apiKey: myPreferences.openAIAPIKey?.trim() ?? "",
      forceMaxCompletionTokens: myPreferences.forceMaxCompletionTokens,
    },
    gemini: {
      enabled: myPreferences.enableGeminiTranslate,
      endpoint: myPreferences.geminiAPIURL.trim(),
      model: myPreferences.geminiModel.trim(),
      apiKey: myPreferences.geminiAPIKey?.trim() ?? "",
    },
  };
}
