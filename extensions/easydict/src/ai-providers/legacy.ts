/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { randomUUID } from "node:crypto";

import {
  getAIProviderKey,
  getBuiltinProviderKey,
  getProviderOrder,
  type ProviderOrderCandidate,
  reconcileProviderOrder,
  syncAIProviderOrders,
} from "@/core/query/providerOrder";
import { TranslationType } from "@/types/api";

import { normalizeOpenAICompatibleEndpoint } from "./endpoint";
import { inferTokenLimitMode } from "./tokenLimit";
import type {
  LegacyAIProviderName,
  OpenAICompatibleProfile,
  StoredAIProviderState,
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

export function createProfileFromLegacySettings(
  provider: LegacyAIProviderName,
  configuration: LegacyAIProviderConfiguration,
  order: number,
): OpenAICompatibleProfile {
  const legacy = configuration[provider];
  return {
    id: randomUUID(),
    adapter: "openai-compatible",
    name: provider === "openai" ? "OpenAI" : "Gemini",
    enabled: legacy.enabled,
    order,
    icon: { kind: "preset", name: provider },
    wordResultMode: "translation",
    endpoint:
      provider === "openai"
        ? normalizeOpenAICompatibleEndpoint(legacy.endpoint)
        : normalizeGeminiEndpoint(legacy.endpoint),
    ...(provider === "gemini" ? { website: "https://gemini.google.com" } : {}),
    model: legacy.model.trim(),
    apiKey: legacy.apiKey.trim(),
    jsonOutputMode: "prompt",
    tokenLimitMode:
      provider === "openai" && configuration.openai.forceMaxCompletionTokens
        ? "max-completion-tokens"
        : inferTokenLimitMode(legacy.endpoint, legacy.model),
  };
}

/** Convert old slots once; ordinary provider identity never depends on migration history. */
export function migrateLegacyAIProviderState(
  state: StoredAIProviderStateV1 | StoredAIProviderState,
  legacy: LegacyAIProviderConfiguration,
  builtinCandidates: ProviderOrderCandidate[],
  servicesOrder: string[] = [],
): StoredAIProviderState {
  const assignments = { ...state.legacyProviderAssignments };
  const migrated = new Set<LegacyAIProviderName>(state.version === 2 ? state.migratedLegacyProviders : []);
  const profiles = [...state.profiles];
  const legacyProfileKeys = new Map<string, string>();
  const legacyCandidates = LEGACY_AI_PROVIDER_NAMES.map((provider) => ({
    providerKey: getBuiltinProviderKey(
      "translation",
      provider === "openai" ? TranslationType.OpenAI : TranslationType.Gemini,
    ),
    type: provider === "openai" ? TranslationType.OpenAI : TranslationType.Gemini,
    serviceOrder: 0,
  }));

  for (const [index, provider] of LEGACY_AI_PROVIDER_NAMES.entries()) {
    const assignment = assignments[provider];
    if (assignment) {
      migrated.add(provider);
      if (assignment.kind === "profile") {
        const profile = profiles.find((candidate) => candidate.id === assignment.profileId);
        if (profile) {
          legacyProfileKeys.set(legacyCandidates[index].providerKey, getAIProviderKey(profile));
        }
      }
    } else if (!migrated.has(provider) && legacy[provider].apiKey.trim()) {
      const profile = createProfileFromLegacySettings(
        provider,
        legacy,
        Math.max(-1, ...profiles.map((p) => p.order)) + 1,
      );
      profiles.push(profile);
      legacyProfileKeys.set(legacyCandidates[index].providerKey, getAIProviderKey(profile));
      assignments[provider] = { kind: "profile", profileId: profile.id };
      migrated.add(provider);
    }
  }

  if (state.version === 2 && profiles.length === state.profiles.length) return state;

  const legacyKeyByProfileKey = new Map(
    [...legacyProfileKeys].map(([legacyKey, profileKey]) => [profileKey, legacyKey] as const),
  );
  const previousProfiles = state.profiles.filter((profile) => !legacyKeyByProfileKey.has(getAIProviderKey(profile)));
  const fallbackOrder = getProviderOrder(previousProfiles, undefined, servicesOrder, [
    ...builtinCandidates,
    ...legacyCandidates,
  ]);
  const savedOrder = (state.providerOrder ?? fallbackOrder).map((key) => legacyKeyByProfileKey.get(key) ?? key);
  // Earlier migrations drop slots without credentials. Restore newly imported slots
  // before their next surviving fallback neighbor without reordering saved providers.
  for (const [index, key] of fallbackOrder.entries()) {
    if (!legacyProfileKeys.has(key) || savedOrder.includes(key)) continue;
    const nextKey = fallbackOrder.slice(index + 1).find((candidate) => savedOrder.includes(candidate));
    savedOrder.splice(nextKey === undefined ? savedOrder.length : savedOrder.indexOf(nextKey), 0, key);
  }
  const previousOrder = reconcileProviderOrder(savedOrder, fallbackOrder, fallbackOrder);
  const legacyKeys = new Set(legacyCandidates.map((candidate) => candidate.providerKey));
  const migratedOrder = previousOrder.flatMap((key) => {
    if (!legacyKeys.has(key)) return [key];
    const profileKey = legacyProfileKeys.get(key);
    return profileKey ? [profileKey] : [];
  });
  const providerOrder = getProviderOrder(profiles, migratedOrder, servicesOrder, builtinCandidates);
  const migratedLegacyProviders = LEGACY_AI_PROVIDER_NAMES.filter((provider) => migrated.has(provider));
  return {
    version: 2,
    profiles: syncAIProviderOrders(profiles, providerOrder),
    ...(providerOrder.length > 0 ? { providerOrder } : {}),
    migratedLegacyProviders,
    ...(migratedLegacyProviders.length < LEGACY_AI_PROVIDER_NAMES.length && Object.keys(assignments).length > 0
      ? { legacyProviderAssignments: assignments }
      : {}),
  };
}

function normalizeGeminiEndpoint(endpoint: string): string {
  const normalized = normalizeOpenAICompatibleEndpoint(endpoint);
  return normalized.endsWith("/v1beta/openai") ? normalized : `${normalized}/v1beta/openai`;
}
