/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { myPreferences } from "@/consts";
import { ProviderConfig } from "@/providers/shared/config";
import { TranslationType } from "@/types/api";

import { getEffectiveLegacyAIProviderAssignment, type LegacyAIProviderConfiguration } from "./legacy";
import type { AIProviderProfile, LegacyAIProviderName, StoredAIProviderStateV1 } from "./types";

export function getLegacyAIProviderConfiguration(): LegacyAIProviderConfiguration {
  return {
    openai: {
      enabled: myPreferences.enableOpenAITranslate,
      endpoint: ProviderConfig.openAIEndpoint,
      model: ProviderConfig.openAIModel,
      apiKey: ProviderConfig.openAIAPIKey ?? "",
      forceMaxCompletionTokens: ProviderConfig.forceMaxCompletionTokens,
    },
    gemini: {
      enabled: myPreferences.enableGeminiTranslate,
      endpoint: ProviderConfig.geminiEndpoint,
      model: ProviderConfig.geminiModel,
      apiKey: ProviderConfig.geminiAPIKey ?? "",
    },
  };
}

export function isLegacyAIProviderConfigured(
  provider: LegacyAIProviderName,
  configuration = getLegacyAIProviderConfiguration(),
): boolean {
  return Boolean(configuration[provider].apiKey);
}

export function getLegacyAIProviderName(type: string): LegacyAIProviderName | undefined {
  if (type === TranslationType.OpenAI) return "openai";
  if (type === TranslationType.Gemini) return "gemini";
  return undefined;
}

export function isLegacyAIProviderAvailable(
  provider: LegacyAIProviderName,
  profiles: AIProviderProfile[],
  assignments: StoredAIProviderStateV1["legacyProviderAssignments"],
  configuration = getLegacyAIProviderConfiguration(),
): boolean {
  return (
    isLegacyAIProviderConfigured(provider, configuration) &&
    getEffectiveLegacyAIProviderAssignment(provider, profiles, assignments) === undefined
  );
}
