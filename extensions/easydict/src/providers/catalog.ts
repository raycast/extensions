/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { DictionaryType, TranslationType } from "@/core/results/kinds";
import type { BooleanPreferenceKey } from "@/types/preferences";

type BuiltinProviderCategory = "dictionary" | "translation";

export const defaultTypeOrder = [
  DictionaryType.Youdao,
  DictionaryType.Linguee,
  DictionaryType.AI,
  TranslationType.OpenAI,
  TranslationType.Gemini,
  TranslationType.DeepL,
  TranslationType.DeepLX,
  TranslationType.Google,
  TranslationType.Bing,
  TranslationType.Apple,
  TranslationType.Baidu,
  TranslationType.Tencent,
  TranslationType.Volcano,
  TranslationType.Youdao,
  TranslationType.Caiyun,
];

export function getBuiltinProviderKey(category: BuiltinProviderCategory, type: string): string {
  return `builtin:${category}:${type}`;
}

const definitions = [
  { category: "dictionary", type: DictionaryType.Youdao, preference: "enableYoudaoDictionary" },
  { category: "dictionary", type: DictionaryType.Linguee, preference: "enableLingueeDictionary" },
  { category: "translation", type: TranslationType.Bing, preference: "enableBingTranslate" },
  { category: "translation", type: TranslationType.Baidu, preference: "enableBaiduTranslate" },
  { category: "translation", type: TranslationType.Tencent, preference: "enableTencentTranslate" },
  { category: "translation", type: TranslationType.Volcano, preference: "enableVolcanoTranslate" },
  { category: "translation", type: TranslationType.Caiyun, preference: "enableCaiyunTranslate" },
  { category: "translation", type: TranslationType.Google, preference: "enableGoogleTranslate" },
  { category: "translation", type: TranslationType.DeepL, preference: "enableDeepLTranslate" },
  { category: "translation", type: TranslationType.DeepLX, preference: "enableDeepLXTranslate" },
  { category: "translation", type: TranslationType.Apple, preference: "enableAppleTranslate" },
  { category: "translation", type: TranslationType.Youdao, preference: "enableYoudaoTranslate" },
] as const satisfies ReadonlyArray<{
  category: BuiltinProviderCategory;
  type: DictionaryType | TranslationType;
  preference: BooleanPreferenceKey;
}>;

export const builtinProviderCatalog = definitions.map((definition) => ({
  ...definition,
  id: `static:${definition.type}`,
  label: definition.type,
  providerKey: getBuiltinProviderKey(definition.category, definition.type),
  order: defaultTypeOrder.indexOf(definition.type),
}));

export type BuiltinProvider = (typeof builtinProviderCatalog)[number];
export const builtinDictionaryProviders = builtinProviderCatalog.filter(
  (provider) => provider.category === "dictionary",
);
export const builtinTranslationProviders = builtinProviderCatalog.filter(
  (provider) => provider.category === "translation",
);

export function getBuiltinProviderPreferenceStatus(provider: BuiltinProvider, preferences: Preferences) {
  return {
    enabledInPreferences: preferences[provider.preference],
    implicitlyEnabledBy:
      provider.type === TranslationType.DeepL && preferences.enableLingueeDictionary && preferences.deepLAuthKey
        ? "Linguee"
        : provider.type === TranslationType.Youdao && preferences.enableYoudaoDictionary
          ? "Youdao Dictionary"
          : undefined,
  };
}
