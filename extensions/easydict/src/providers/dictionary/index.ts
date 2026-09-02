/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getAIProviderQueryMode, resolveAIProviderIcon } from "@/ai-providers/runtime";
import type { AIProviderProfile } from "@/ai-providers/types";
import { myPreferences } from "@/consts";
import { getLanguageOfTwoExceptChinese } from "@/core/language/utils";
import {
  assignGlobalServiceOrder,
  getAIProviderKey,
  getBuiltinProviderCandidates,
  getBuiltinProviderKey,
  getProviderOrder,
} from "@/core/query/providerOrder";
import { getLingueeWebDictionaryURL } from "@/providers/dictionary/linguee/parse";
import { getYoudaoWebDictionaryURL } from "@/providers/dictionary/youdao/utils";
import { checkIsWord } from "@/providers/shared/utils";
import { DictionaryType } from "@/types/api";
import type { BooleanPreferenceKey } from "@/types/preferences";
import type { QueryInput, RuntimeServiceConfig } from "@/types/query";

import { createAIDictionaryProvider } from "./ai";
import type { BaseDictionaryProvider } from "./base";
import { LingueeDictionaryProvider } from "./linguee";
import { YoudaoDictionaryProvider } from "./youdao";

interface DictionaryWebServiceConfig {
  type: DictionaryType;
  getWebUrl?: (queryWordInfo: QueryInput) => string | undefined;
}

export interface DictionaryServiceConfig extends DictionaryWebServiceConfig, RuntimeServiceConfig {
  /** Built-in provider's Extension Settings checkbox; dynamic AI providers omit this metadata. */
  enabledInPreferences?: boolean;
  enabled: (queryWordInfo: QueryInput) => boolean;
  createProvider: () => BaseDictionaryProvider;
  canTriggerAutomaticAudio: boolean;
}

const staticDictionaryServices: Array<
  DictionaryWebServiceConfig & {
    preference: BooleanPreferenceKey;
    provider: new () => BaseDictionaryProvider;
    isEnabled?: (queryWordInfo: QueryInput) => boolean;
  }
> = [
  {
    type: DictionaryType.Youdao,
    preference: "enableYoudaoDictionary",
    isEnabled: (q) =>
      myPreferences.enableYoudaoDictionary && getYoudaoWebDictionaryURL(q) !== undefined && checkIsWord(q),
    provider: YoudaoDictionaryProvider,
    getWebUrl: getYoudaoWebDictionaryURL,
  },
  {
    type: DictionaryType.Linguee,
    preference: "enableLingueeDictionary",
    provider: LingueeDictionaryProvider,
    getWebUrl: getLingueeWebDictionaryURL,
  },
];

const staticDictionaryServicesWithOrder: DictionaryServiceConfig[] = staticDictionaryServices.map((service, order) => ({
  id: `static:${service.type}`,
  label: service.type,
  providerKey: getBuiltinProviderKey("dictionary", service.type),
  enabledInPreferences: myPreferences[service.preference],
  order,
  type: service.type,
  enabled: service.isEnabled ?? (() => myPreferences[service.preference]),
  createProvider: () => new service.provider(),
  canTriggerAutomaticAudio: true,
  getWebUrl: service.getWebUrl,
}));

const categoryProviderOrder = getProviderOrder(
  [],
  undefined,
  myPreferences.servicesOrder ? myPreferences.servicesOrder.split(",") : [],
  getBuiltinProviderCandidates(staticDictionaryServicesWithOrder),
);
export const dictionaryProviderServices = assignGlobalServiceOrder(
  staticDictionaryServicesWithOrder,
  categoryProviderOrder,
);

export function resolveDictionaryServices(
  profiles: AIProviderProfile[],
  providerOrder?: string[],
): DictionaryServiceConfig[] {
  const dynamicServices = profiles
    .filter((profile) => profile.wordResultMode === "dictionary")
    .map((profile): DictionaryServiceConfig => ({
      id: `profile:${profile.id}:dictionary`,
      label: profile.name,
      providerKey: getAIProviderKey(profile),
      order: profile.order,
      type: DictionaryType.AI,
      icon: resolveAIProviderIcon(profile),
      enabled: (queryWordInfo) => getAIProviderQueryMode(profile, queryWordInfo) === "dictionary",
      createProvider: () => createAIDictionaryProvider(profile),
      canTriggerAutomaticAudio: false,
    }));
  const servicesOrder = myPreferences.servicesOrder ? myPreferences.servicesOrder.split(",") : [];
  const resolvedProviderOrder =
    providerOrder ??
    getProviderOrder(
      profiles,
      undefined,
      servicesOrder,
      getBuiltinProviderCandidates(staticDictionaryServicesWithOrder),
    );
  return assignGlobalServiceOrder([...dictionaryProviderServices, ...dynamicServices], resolvedProviderOrder);
}

export const dictionaryServices: DictionaryWebServiceConfig[] = [
  ...dictionaryProviderServices,
  {
    type: DictionaryType.Eudic,
    getWebUrl: (q) => {
      const LangCode = getLanguageOfTwoExceptChinese([q.fromLanguage, q.toLanguage]);
      if (!LangCode) return;
      const eudicDictionaryLanguages = ["en", "fr", "de", "es"];
      if (eudicDictionaryLanguages.includes(LangCode)) {
        return `https://dict.eudic.net/dicts/${LangCode}/${encodeURIComponent(q.word)}`;
      }
    },
  },
];
