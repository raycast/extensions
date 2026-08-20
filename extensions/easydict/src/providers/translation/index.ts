/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { myPreferences } from "@/consts";
import { getLangCode } from "@/core/language/utils";
import { getLingueeWebDictionaryURL } from "@/providers/dictionary/linguee/parse";
import { getYoudaoWebDictionaryURL } from "@/providers/dictionary/youdao/utils";
import { checkIsWord } from "@/providers/shared/utils";
import { TranslationType } from "@/types/api";
import type { BooleanPreferenceKey } from "@/types/preferences";
import type { QueryInput } from "@/types/query";

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

export interface TranslationServiceConfig {
  type: TranslationType;
  preference: BooleanPreferenceKey;
  provider: new () => BaseTranslateProvider;
  getWebUrl?: (queryWordInfo: QueryInput) => string | undefined;
  isEnabled?: (queryWordInfo: QueryInput) => boolean;
}

/** Static registry — provider classes, instantiated by the engine. */
export const translationServices: TranslationServiceConfig[] = [
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
  { type: TranslationType.Gemini, preference: "enableGeminiTranslate", provider: GeminiTranslateProvider },
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
  },
];
