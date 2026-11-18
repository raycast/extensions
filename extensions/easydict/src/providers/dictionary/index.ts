/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { myPreferences } from "@/consts";
import { DictionaryType } from "@/core/results/kinds";
import type { QueryInput, RuntimeServiceConfig } from "@/core/results/types";
import { builtinDictionaryProviders } from "@/providers/catalog";
import { getYoudaoWebDictionaryURL } from "@/providers/dictionary/youdao/utils";
import { checkIsWord } from "@/providers/shared/utils";

import type { BaseDictionaryProvider } from "./base";
import { LingueeDictionaryProvider } from "./linguee";
import { YoudaoDictionaryProvider } from "./youdao";

export interface DictionaryServiceConfig extends RuntimeServiceConfig {
  type: DictionaryType;
  enabled: (queryWordInfo: QueryInput) => boolean;
  createProvider: () => BaseDictionaryProvider;
  canTriggerAutomaticAudio: boolean;
}

const builtinProviderClasses = {
  [DictionaryType.Youdao]: YoudaoDictionaryProvider,
  [DictionaryType.Linguee]: LingueeDictionaryProvider,
} satisfies Record<(typeof builtinDictionaryProviders)[number]["type"], new () => BaseDictionaryProvider>;

export const builtinDictionaryServices: DictionaryServiceConfig[] = builtinDictionaryProviders.map((service) => ({
  ...service,
  cacheIdentity: service.type,
  enabled: (query) =>
    myPreferences[service.preference] &&
    (service.type !== DictionaryType.Youdao || (getYoudaoWebDictionaryURL(query) !== undefined && checkIsWord(query))),
  createProvider: () => new builtinProviderClasses[service.type](),
  canTriggerAutomaticAudio: true,
}));
