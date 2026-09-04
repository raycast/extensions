/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { AIProviderProfile, StoredAIProviderStateV1 } from "@/ai-providers/types";
import { myPreferences } from "@/consts";
import {
  assignGlobalServiceOrder,
  getAvailableProviderKeys,
  getBuiltinProviderCandidates,
  getProviderOrder,
} from "@/core/query/providerOrder";
import { TranslationType } from "@/types/api";

import { dictionaryProviderServices, type DictionaryServiceConfig, resolveDictionaryServices } from "./dictionary";
import type { NativeJSONUnsupportedHandler } from "./dictionary/ai";
import { resolveTranslationServices, type TranslationServiceConfig, translationServices } from "./translation";

const builtinServices = [...dictionaryProviderServices, ...translationServices];
const builtinCandidates = getBuiltinProviderCandidates(builtinServices);

function getLegacyServicesOrder(): string[] {
  return myPreferences.servicesOrder ? myPreferences.servicesOrder.split(",") : [];
}

const defaultProviderOrder = getProviderOrder([], undefined, getLegacyServicesOrder(), builtinCandidates);

/** Built-in registries with one shared provider order for UI and runtime consumers. */
export const builtinDictionaryProviderServices = assignGlobalServiceOrder(
  dictionaryProviderServices,
  defaultProviderOrder,
);
export const builtinTranslationServices = assignGlobalServiceOrder(translationServices, defaultProviderOrder);
export const builtinTranslationServicesBeforeAIProfilesLoad = builtinTranslationServices.filter(
  (service) => service.type !== TranslationType.OpenAI && service.type !== TranslationType.Gemini,
);
export const builtinProviderServices = [...builtinDictionaryProviderServices, ...builtinTranslationServices];

export type BuiltinProviderService =
  (typeof builtinDictionaryProviderServices)[number] | (typeof builtinTranslationServices)[number];

export interface ProviderServiceSnapshot {
  translationServices: TranslationServiceConfig[];
  dictionaryServices: DictionaryServiceConfig[];
}

export function getCombinedProviderOrder(
  profiles: AIProviderProfile[],
  savedOrder?: string[],
  servicesOrder: string[] = getLegacyServicesOrder(),
  assignments?: StoredAIProviderStateV1["legacyProviderAssignments"],
): string[] {
  return getProviderOrder(profiles, savedOrder, servicesOrder, builtinCandidates, assignments);
}

export function getCombinedAvailableProviderKeys(
  profiles: AIProviderProfile[],
  assignments?: StoredAIProviderStateV1["legacyProviderAssignments"],
): string[] {
  return getAvailableProviderKeys(profiles, builtinCandidates, assignments);
}

export function resolveProviderServices(
  state: StoredAIProviderStateV1,
  onNativeJSONUnsupported?: NativeJSONUnsupportedHandler,
): ProviderServiceSnapshot {
  const { profiles, providerOrder: savedOrder, legacyProviderAssignments: assignments } = state;
  const providerOrder = getCombinedProviderOrder(profiles, savedOrder, getLegacyServicesOrder(), assignments);
  return {
    translationServices: resolveTranslationServices(profiles, providerOrder, assignments),
    dictionaryServices: resolveDictionaryServices(profiles, providerOrder, onNativeJSONUnsupported, assignments),
  };
}
