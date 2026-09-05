/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { randomUUID } from "node:crypto";

import { normalizeOpenAICompatibleEndpoint } from "./endpoint";
import { inferTokenLimitMode } from "./tokenLimit";
import type {
  AIProviderProfile,
  LegacyAIProviderAssignment,
  LegacyAIProviderName,
  OpenAICompatibleProfile,
  StoredAIProviderStateV1,
} from "./types";

export const LEGACY_AI_PROVIDER_NAMES = ["openai", "gemini"] as const satisfies readonly LegacyAIProviderName[];

/**
 * Compatibility contract:
 * The OpenAI/Gemini preference names consumed here must remain in package.json
 * until the migration has shipped across the agreed compatibility window.
 * Removing them earlier would make existing API keys unavailable for import.
 */
export interface LegacyAIProviderConfiguration {
  openai: {
    enabled: boolean;
    endpoint: string;
    model: string;
    apiKey: string;
    forceMaxCompletionTokens: boolean;
  };
  gemini: {
    enabled: boolean;
    endpoint: string;
    model: string;
    apiKey: string;
  };
}

export function importLegacyAIProviders(
  state: StoredAIProviderStateV1,
  legacy: LegacyAIProviderConfiguration,
  providerNames: LegacyAIProviderName[] = getImportableLegacyAIProviderNames(state, legacy),
): StoredAIProviderStateV1 {
  const imported: OpenAICompatibleProfile[] = [];
  const requestedProviders = new Set(providerNames);
  const assignments = { ...state.legacyProviderAssignments };
  if (requestedProviders.has("openai") && legacy.openai.apiKey && assignments.openai === undefined) {
    const id = randomUUID();
    imported.push({
      id,
      adapter: "openai-compatible",
      name: "OpenAI",
      enabled: legacy.openai.enabled,
      order: state.profiles.length + imported.length,
      icon: { kind: "preset", name: "openai" },
      wordResultMode: "translation",
      endpoint: normalizeOpenAICompatibleEndpoint(legacy.openai.endpoint),
      model: legacy.openai.model,
      apiKey: legacy.openai.apiKey,
      jsonOutputMode: "prompt",
      tokenLimitMode: legacy.openai.forceMaxCompletionTokens
        ? "max-completion-tokens"
        : inferTokenLimitMode(legacy.openai.endpoint, legacy.openai.model),
    });
    assignments.openai = { kind: "profile", profileId: id };
  }
  if (requestedProviders.has("gemini") && legacy.gemini.apiKey && assignments.gemini === undefined) {
    const id = randomUUID();
    imported.push({
      id,
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
    assignments.gemini = { kind: "profile", profileId: id };
  }

  if (imported.length === 0) return state;
  const nextOrder = Math.max(-1, ...state.profiles.map((profile) => profile.order)) + 1;
  return {
    ...state,
    profiles: [...state.profiles, ...imported.map((profile, index) => ({ ...profile, order: nextOrder + index }))],
    legacyProviderAssignments: assignments,
  };
}

export function getImportableLegacyAIProviderNames(
  state: StoredAIProviderStateV1,
  legacy: LegacyAIProviderConfiguration,
): LegacyAIProviderName[] {
  return LEGACY_AI_PROVIDER_NAMES.filter(
    (provider) => Boolean(legacy[provider].apiKey) && state.legacyProviderAssignments?.[provider] === undefined,
  );
}

export function getLegacyAIProviderReplacement(
  profileId: string,
  assignments: StoredAIProviderStateV1["legacyProviderAssignments"],
): LegacyAIProviderName | undefined {
  return LEGACY_AI_PROVIDER_NAMES.find((provider) => {
    const assignment = assignments?.[provider];
    return assignment?.kind === "profile" && assignment.profileId === profileId;
  });
}

export function getEffectiveLegacyAIProviderAssignment(
  provider: LegacyAIProviderName,
  profiles: AIProviderProfile[],
  assignments: StoredAIProviderStateV1["legacyProviderAssignments"],
): LegacyAIProviderAssignment | undefined {
  const assignment = assignments?.[provider];
  if (assignment?.kind !== "profile") return assignment;
  return profiles.some((profile) => profile.id === assignment.profileId) ? assignment : { kind: "retired" };
}

export function normalizeLegacyAIProviderAssignments(
  profiles: AIProviderProfile[],
  assignments: StoredAIProviderStateV1["legacyProviderAssignments"],
): StoredAIProviderStateV1["legacyProviderAssignments"] {
  if (!assignments) return undefined;
  return Object.fromEntries(
    LEGACY_AI_PROVIDER_NAMES.flatMap((provider) => {
      const assignment = getEffectiveLegacyAIProviderAssignment(provider, profiles, assignments);
      return assignment ? [[provider, assignment]] : [];
    }),
  );
}

function normalizeGeminiEndpoint(endpoint: string): string {
  const normalized = endpoint.trim().replace(/\/+$/, "");
  return normalized.endsWith("/v1beta/openai") ? normalized : `${normalized}/v1beta/openai`;
}
