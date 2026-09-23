/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { AIProviderProfile, StoredAIProviderState } from "@/ai-providers/types";
import { myPreferences } from "@/consts";
import {
  assignGlobalServiceOrder,
  getAvailableProviderKeys,
  getBuiltinProviderCandidates,
  getProviderOrder,
} from "@/core/query/providerOrder";

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
): string[] {
  return getProviderOrder(profiles, savedOrder, servicesOrder, builtinCandidates);
}

export function getCombinedAvailableProviderKeys(profiles: AIProviderProfile[]): string[] {
  return getAvailableProviderKeys(profiles, builtinCandidates);
}

export function resolveProviderServices(
  state: StoredAIProviderState,
  onNativeJSONUnsupported?: NativeJSONUnsupportedHandler,
): ProviderServiceSnapshot {
  const { profiles, providerOrder: savedOrder } = state;
  const providerOrder = getCombinedProviderOrder(profiles, savedOrder, getLegacyServicesOrder());
  return {
    translationServices: resolveTranslationServices(profiles, providerOrder),
    dictionaryServices: resolveDictionaryServices(profiles, providerOrder, onNativeJSONUnsupported),
  };
}
