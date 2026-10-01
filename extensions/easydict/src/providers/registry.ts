/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { myPreferences } from "@/consts";
import { DictionaryType, TranslationType } from "@/core/results/kinds";
import type { ProviderIconConfig, QueryInput } from "@/core/results/types";
import { getAIProviderCacheIdentity } from "@/providers/profiles/cacheIdentity";
import { isAIDictionaryCandidate } from "@/providers/profiles/dictionaryCandidate";
import { resolveAIProviderRuntimeConfig } from "@/providers/profiles/runtime";
import type { AIProviderProfile, StoredAIProviderState } from "@/providers/profiles/types";

import { builtinDictionaryServices, type DictionaryServiceConfig } from "./dictionary";
import { createAIDictionaryProvider, type NativeJSONUnsupportedHandler } from "./dictionary/ai";
import { assignGlobalServiceOrder, getAIProviderKey, getCombinedProviderOrder } from "./order";
import { builtinTranslationServices as builtinTranslations, type TranslationServiceConfig } from "./translation";
import { createAITranslationProvider } from "./translation/ai";

interface ProviderServiceSnapshot {
  translationServices: TranslationServiceConfig[];
  dictionaryServices: DictionaryServiceConfig[];
}

/**
 * Cache identities carry a prompt version per AI surface, so changing one prompt invalidates
 * only its own cached results. Bump the matching constant when that prompt changes.
 */
const AI_TRANSLATION_PROMPT_VERSION = 1;
const AI_DICTIONARY_PROMPT_VERSION = 2;

export function resolveProviderServices(
  state: StoredAIProviderState,
  onNativeJSONUnsupported?: NativeJSONUnsupportedHandler,
): ProviderServiceSnapshot {
  const { profiles, providerOrder: savedOrder } = state;
  const providerOrder = getCombinedProviderOrder(
    profiles,
    savedOrder,
    myPreferences.servicesOrder ? myPreferences.servicesOrder.split(",") : [],
  );
  const translationServices = [...builtinTranslations];
  const dictionaryServices = [...builtinDictionaryServices];
  for (const profile of profiles) {
    const runtime = resolveAIProviderRuntimeConfig(profile);
    const getConfig = () => {
      if (runtime.kind === "issue") throw new Error(runtime.message);
      return runtime.config;
    };
    const enabled = profile.enabled && runtime.kind === "ready";
    const isDictionaryQuery = (query: QueryInput) =>
      profile.wordResultMode === "dictionary" && isAIDictionaryCandidate(query);
    const common = {
      label: profile.name,
      providerKey: getAIProviderKey(profile),
      order: profile.order,
      icon: resolveAIProviderIcon(profile),
    };
    translationServices.push({
      ...common,
      id: `profile:${profile.id}`,
      cacheIdentity: getAIProviderCacheIdentity(profile, AI_TRANSLATION_PROMPT_VERSION),
      type: TranslationType.OpenAI,
      enabled: (query) => enabled && !isDictionaryQuery(query),
      createProvider: () => createAITranslationProvider(getConfig()),
    });
    if (profile.wordResultMode === "dictionary") {
      dictionaryServices.push({
        ...common,
        id: `profile:${profile.id}:dictionary`,
        cacheIdentity: getAIProviderCacheIdentity(profile, AI_DICTIONARY_PROMPT_VERSION),
        type: DictionaryType.AI,
        enabled: (query) => enabled && isDictionaryQuery(query),
        createProvider: () => createAIDictionaryProvider(getConfig(), onNativeJSONUnsupported),
        canTriggerAutomaticAudio: false,
      });
    }
  }
  return {
    translationServices: assignGlobalServiceOrder(translationServices, providerOrder),
    dictionaryServices: assignGlobalServiceOrder(dictionaryServices, providerOrder),
  };
}

const builtinSnapshot = resolveProviderServices({ version: 2, profiles: [], migratedLegacyProviders: [] });
export const builtinDictionaryProviderServices = builtinSnapshot.dictionaryServices;
export const builtinTranslationServices = builtinSnapshot.translationServices;

function resolveAIProviderIcon(profile: AIProviderProfile): ProviderIconConfig {
  if (profile.icon.kind !== "favicon" || profile.icon.website || profile.adapter !== "openai-compatible") {
    return profile.icon;
  }
  return { kind: "favicon", website: profile.website ?? profile.endpoint };
}
