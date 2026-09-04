/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import {
  getLegacyAIProviderName,
  isLegacyAIProviderAvailable,
  isLegacyAIProviderConfigured,
} from "@/ai-providers/legacyConfiguration";
import { getAIProviderQueryMode, resolveAIProviderIcon } from "@/ai-providers/runtime";
import type { AIProviderProfile, StoredAIProviderStateV1 } from "@/ai-providers/types";
import { myPreferences } from "@/consts";
import { getLangCode } from "@/core/language/utils";
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
import { TranslationType } from "@/types/api";
import type { BooleanPreferenceKey } from "@/types/preferences";
import type { QueryInput, RuntimeServiceConfig } from "@/types/query";

import { createAITranslationProvider } from "./ai";
import { AppleTranslateProvider } from "./apple";
import { BaiduTranslateProvider } from "./baidu";
import type { BaseTranslateProvider } from "./base";
import { BingTranslateProvider } from "./bing";
import { CaiyunTranslateProvider } from "./caiyun";
import { DeepLTranslateProvider } from "./deepL";
import { DeepLXTranslateProvider } from "./deepLX";
import { GoogleTranslateProvider } from "./google";
import { GeminiTranslateProvider, OpenAITranslateProvider } from "./openai-compatible";
import { TencentTranslateProvider } from "./tencent";
import { VolcanoTranslateProvider } from "./volcano";
import { YoudaoTranslateProvider } from "./youdao";

export interface TranslationServiceConfig extends RuntimeServiceConfig {
  type: TranslationType;
  /** Built-in provider's Extension Settings checkbox; dynamic AI providers omit this metadata. */
  enabledInPreferences?: boolean;
  enabled: (queryWordInfo: QueryInput) => boolean;
  createProvider: () => BaseTranslateProvider;
  getWebUrl?: (queryWordInfo: QueryInput) => string | undefined;
}

/** Static registry — provider classes, instantiated by the engine. */
const staticTranslationServices: Array<
  Omit<
    TranslationServiceConfig,
    "id" | "label" | "providerKey" | "enabledInPreferences" | "order" | "enabled" | "createProvider"
  > & {
    preference: BooleanPreferenceKey;
    provider: new () => BaseTranslateProvider;
    isEnabled?: (queryWordInfo: QueryInput) => boolean;
  }
> = [
  { type: TranslationType.Bing, preference: "enableBingTranslate", provider: BingTranslateProvider },
  {
    type: TranslationType.Baidu,
    preference: "enableBaiduTranslate",
    provider: BaiduTranslateProvider,
    getWebUrl: (q) => {
      const text = encodeURIComponent(q.word);
      const from = getLangCode(q.fromLanguage, "baiduLangCode");
      const to = getLangCode(q.toLanguage, "baiduLangCode");
      return from && to ? `https://fanyi.baidu.com/#${from}/${to}/${text}` : undefined;
    },
  },
  { type: TranslationType.Tencent, preference: "enableTencentTranslate", provider: TencentTranslateProvider },
  { type: TranslationType.Volcano, preference: "enableVolcanoTranslate", provider: VolcanoTranslateProvider },
  { type: TranslationType.Caiyun, preference: "enableCaiyunTranslate", provider: CaiyunTranslateProvider },
  {
    type: TranslationType.Gemini,
    preference: "enableGeminiTranslate",
    provider: GeminiTranslateProvider,
    isEnabled: () => myPreferences.enableGeminiTranslate && isLegacyAIProviderConfigured("gemini"),
  },
  {
    type: TranslationType.Google,
    preference: "enableGoogleTranslate",
    provider: GoogleTranslateProvider,
    getWebUrl: (q) => {
      const text = encodeURIComponent(q.word);
      const from = getLangCode(q.fromLanguage, "googleLangCode");
      const to = getLangCode(q.toLanguage, "googleLangCode");
      return from && to ? `https://translate.google.com/?sl=${from}&tl=${to}&text=${text}&op=translate` : undefined;
    },
  },
  {
    type: TranslationType.DeepL,
    preference: "enableDeepLTranslate",
    isEnabled: (q) => {
      const explicitlyEnabled = myPreferences.enableDeepLTranslate;
      const implicitlyEnabledByLinguee =
        myPreferences.enableLingueeDictionary &&
        !!myPreferences.deepLAuthKey &&
        getLingueeWebDictionaryURL(q) !== undefined;
      return explicitlyEnabled || implicitlyEnabledByLinguee;
    },
    provider: DeepLTranslateProvider,
    getWebUrl: (q) => {
      const text = encodeURIComponent(q.word);
      const from = getLangCode(q.fromLanguage, "deepLSourceId")?.toLowerCase();
      const to = getLangCode(q.toLanguage, "deepLSourceId")?.toLowerCase();
      return from && to ? `https://www.deepl.com/translator#${from}/${to}/${text}` : undefined;
    },
  },
  {
    type: TranslationType.DeepLX,
    preference: "enableDeepLXTranslate",
    provider: DeepLXTranslateProvider,
    getWebUrl: (q) => {
      const text = encodeURIComponent(q.word);
      const from = getLangCode(q.fromLanguage, "deepLSourceId")?.toLowerCase();
      const to = getLangCode(q.toLanguage, "deepLSourceId")?.toLowerCase();
      return from && to ? `https://www.deepl.com/translator#${from}/${to}/${text}` : undefined;
    },
  },
  { type: TranslationType.Apple, preference: "enableAppleTranslate", provider: AppleTranslateProvider },
  {
    type: TranslationType.Youdao,
    preference: "enableYoudaoTranslate",
    isEnabled: (q) => {
      const explicitlyEnabled = myPreferences.enableYoudaoTranslate;
      const implicitlyEnabledByDictionary =
        myPreferences.enableYoudaoDictionary && getYoudaoWebDictionaryURL(q) !== undefined && checkIsWord(q);
      return explicitlyEnabled || implicitlyEnabledByDictionary;
    },
    provider: YoudaoTranslateProvider,
  },
  {
    type: TranslationType.OpenAI,
    preference: "enableOpenAITranslate",
    provider: OpenAITranslateProvider,
    isEnabled: () => myPreferences.enableOpenAITranslate && isLegacyAIProviderConfigured("openai"),
  },
];

const staticTranslationServicesWithOrder: TranslationServiceConfig[] = staticTranslationServices.map(
  (service, order) => ({
    id: `static:${service.type}`,
    label: service.type,
    providerKey: getBuiltinProviderKey("translation", service.type),
    enabledInPreferences: myPreferences[service.preference],
    order,
    type: service.type,
    enabled: service.isEnabled ?? (() => myPreferences[service.preference]),
    createProvider: () => new service.provider(),
    getWebUrl: service.getWebUrl,
  }),
);

const categoryProviderOrder = getProviderOrder(
  [],
  undefined,
  myPreferences.servicesOrder ? myPreferences.servicesOrder.split(",") : [],
  getBuiltinProviderCandidates(staticTranslationServicesWithOrder),
);
export const translationServices = assignGlobalServiceOrder(staticTranslationServicesWithOrder, categoryProviderOrder);

export const translationServicesBeforeAIProfilesLoad = translationServices.filter(
  (service) => service.type !== TranslationType.OpenAI && service.type !== TranslationType.Gemini,
);

export function resolveTranslationServices(
  profiles: AIProviderProfile[],
  providerOrder?: string[],
  assignments?: StoredAIProviderStateV1["legacyProviderAssignments"],
): TranslationServiceConfig[] {
  const dynamicServices = profiles.map((profile): TranslationServiceConfig => {
    const common = {
      id: `profile:${profile.id}`,
      label: profile.name,
      providerKey: getAIProviderKey(profile, assignments),
      order: profile.order,
      type: TranslationType.OpenAI,
      icon: resolveAIProviderIcon(profile),
      enabled: (queryWordInfo: QueryInput) => getAIProviderQueryMode(profile, queryWordInfo) === "translation",
    };

    return {
      ...common,
      createProvider: () => createAITranslationProvider(profile),
    };
  });
  const availableBuiltinServices = translationServices.filter((service) => {
    const legacyProvider = getLegacyAIProviderName(service.type);
    return legacyProvider ? isLegacyAIProviderAvailable(legacyProvider, profiles, assignments) : true;
  });
  const servicesOrder = myPreferences.servicesOrder ? myPreferences.servicesOrder.split(",") : [];
  const resolved = [...availableBuiltinServices, ...dynamicServices];
  const resolvedProviderOrder =
    providerOrder ??
    getProviderOrder(
      profiles,
      undefined,
      servicesOrder,
      getBuiltinProviderCandidates(staticTranslationServicesWithOrder),
      assignments,
    );
  return assignGlobalServiceOrder(resolved, resolvedProviderOrder);
}
