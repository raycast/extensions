/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { normalizeOpenAICompatibleEndpoint } from "./endpoint";
import { inferTokenLimitMode } from "./tokenLimit";
import type { AIProviderProfile, OpenAICompatibleProfile, StoredAIProviderStateV1 } from "./types";

export const LEGACY_OPENAI_PROFILE_ID = "legacy-openai";
export const LEGACY_GEMINI_PROFILE_ID = "legacy-gemini";
type LegacyAIProviderName = "openai" | "gemini";

/**
 * Compatibility contract:
 * The OpenAI/Gemini preference names consumed here must remain in package.json
 * until the migration has shipped across the agreed compatibility window.
 * Removing them earlier would make existing API keys unavailable for import.
 */
export interface LegacyAIProviderConfiguration {
  openAI: {
    configured: boolean;
    enabled: boolean;
    endpoint: string;
    model: string;
    apiKey: string;
    forceMaxCompletionTokens: boolean;
  };
  gemini: {
    configured: boolean;
    enabled: boolean;
    endpoint: string;
    model: string;
    apiKey: string;
  };
}

export function importLegacyAIProviders(
  state: StoredAIProviderStateV1,
  legacy: LegacyAIProviderConfiguration,
): StoredAIProviderStateV1 {
  const imported: OpenAICompatibleProfile[] = [];
  if (legacy.openAI.configured) {
    imported.push({
      id: LEGACY_OPENAI_PROFILE_ID,
      adapter: "openai-compatible",
      name: "OpenAI",
      enabled: legacy.openAI.enabled,
      order: state.profiles.length + imported.length,
      icon: { kind: "preset", name: "openai" },
      wordResultMode: "translation",
      endpoint: normalizeOpenAICompatibleEndpoint(legacy.openAI.endpoint),
      website: "https://openai.com",
      model: legacy.openAI.model,
      apiKey: legacy.openAI.apiKey,
      jsonOutputMode: "prompt",
      tokenLimitMode: legacy.openAI.forceMaxCompletionTokens
        ? "max-completion-tokens"
        : inferTokenLimitMode(legacy.openAI.endpoint, legacy.openAI.model),
    });
  }
  if (legacy.gemini.configured) {
    imported.push({
      id: LEGACY_GEMINI_PROFILE_ID,
      adapter: "openai-compatible",
      name: "Gemini",
      enabled: legacy.gemini.enabled,
      order: state.profiles.length + imported.length,
      icon: { kind: "preset", name: "gemini" },
      wordResultMode: "translation",
      endpoint: normalizeGeminiEndpoint(legacy.gemini.endpoint),
      website: "https://gemini.google.com",
      model: legacy.gemini.model,
      apiKey: legacy.gemini.apiKey,
      jsonOutputMode: "prompt",
      tokenLimitMode: inferTokenLimitMode(legacy.gemini.endpoint, legacy.gemini.model),
    });
  }

  const existingIds = new Set(state.profiles.map((profile) => profile.id));
  const nextOrder = Math.max(-1, ...state.profiles.map((profile) => profile.order)) + 1;
  const missingProfiles = imported
    .filter((profile) => !existingIds.has(profile.id))
    .map((profile, index) => ({ ...profile, order: nextOrder + index }));
  if (state.migration?.legacyPreferencesImported && missingProfiles.length === 0) return state;
  return {
    ...state,
    profiles: [...state.profiles, ...missingProfiles],
    migration: { legacyPreferencesImported: true },
  };
}

export function hasLegacyAIProvidersToImport(
  state: StoredAIProviderStateV1,
  legacy: LegacyAIProviderConfiguration,
): boolean {
  const existingIds = new Set(state.profiles.map((profile) => profile.id));
  return (
    (legacy.openAI.configured && !existingIds.has(LEGACY_OPENAI_PROFILE_ID)) ||
    (legacy.gemini.configured && !existingIds.has(LEGACY_GEMINI_PROFILE_ID))
  );
}

export function hasImportedLegacyAIProvider(profiles: AIProviderProfile[], provider: LegacyAIProviderName): boolean {
  const profileId = provider === "openai" ? LEGACY_OPENAI_PROFILE_ID : LEGACY_GEMINI_PROFILE_ID;
  return profiles.some((profile) => profile.id === profileId);
}

export function normalizeGeminiEndpoint(endpoint: string): string {
  const normalized = endpoint.trim().replace(/\/+$/, "");
  return normalized.endsWith("/v1beta/openai") ? normalized : `${normalized}/v1beta/openai`;
}
