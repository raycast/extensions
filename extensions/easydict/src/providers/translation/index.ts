/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { myPreferences } from "@/consts";
import { TranslationType } from "@/core/results/kinds";
import type { QueryInput, RuntimeServiceConfig } from "@/core/results/types";
import { builtinTranslationProviders, getBuiltinProviderPreferenceStatus } from "@/providers/catalog";
import { getLingueeWebDictionaryURL } from "@/providers/dictionary/linguee/url";
import { getYoudaoWebDictionaryURL } from "@/providers/dictionary/youdao/utils";
import { checkIsWord } from "@/providers/shared/utils";

import { AppleTranslateProvider } from "./apple";
import { BaiduTranslateProvider } from "./baidu";
import type { BaseTranslateProvider } from "./base";
import { BingTranslateProvider } from "./bing";
import { CaiyunTranslateProvider } from "./caiyun";
import { DeepLTranslateProvider } from "./deepL";
import { DeepLXTranslateProvider } from "./deepLX";
import { GoogleTranslateProvider } from "./google";
import { TencentTranslateProvider } from "./tencent";
import { VolcanoTranslateProvider } from "./volcano";
import { YoudaoTranslateProvider } from "./youdao";

export interface TranslationServiceConfig extends RuntimeServiceConfig {
  type: TranslationType;
  enabled: (queryWordInfo: QueryInput) => boolean;
  createProvider: () => BaseTranslateProvider;
}

function getBuiltinTranslationCacheIdentity(type: TranslationType): string {
  switch (type) {
    case TranslationType.Bing:
      return JSON.stringify({ type, host: myPreferences.bingHost });
    case TranslationType.DeepL:
      return JSON.stringify({ type, endpoint: myPreferences.deepLEndpoint, credential: myPreferences.deepLAuthKey });
    case TranslationType.Baidu:
      return JSON.stringify({ type, appId: myPreferences.baiduAppId, credential: myPreferences.baiduAppSecret });
    case TranslationType.Tencent:
      return JSON.stringify({
        type,
        secretId: myPreferences.tencentSecretId,
        credential: myPreferences.tencentSecretKey,
      });
    case TranslationType.Volcano:
      return JSON.stringify({
        type,
        accessKeyId: myPreferences.volcanoAccessKeyId,
        credential: myPreferences.volcanoAccessKeySecret,
      });
    case TranslationType.Caiyun:
      return JSON.stringify({ type, credential: myPreferences.caiyunToken });
    default:
      return type;
  }
}

const builtinProviderClasses = {
  [TranslationType.Bing]: BingTranslateProvider,
  [TranslationType.Baidu]: BaiduTranslateProvider,
  [TranslationType.Tencent]: TencentTranslateProvider,
  [TranslationType.Volcano]: VolcanoTranslateProvider,
  [TranslationType.Caiyun]: CaiyunTranslateProvider,
  [TranslationType.Google]: GoogleTranslateProvider,
  [TranslationType.DeepL]: DeepLTranslateProvider,
  [TranslationType.DeepLX]: DeepLXTranslateProvider,
  [TranslationType.Apple]: AppleTranslateProvider,
  [TranslationType.Youdao]: YoudaoTranslateProvider,
} satisfies Record<(typeof builtinTranslationProviders)[number]["type"], new () => BaseTranslateProvider>;

export const builtinTranslationServices: TranslationServiceConfig[] = builtinTranslationProviders.map((service) => {
  const status = getBuiltinProviderPreferenceStatus(service, myPreferences);
  return {
    ...service,
    cacheIdentity: getBuiltinTranslationCacheIdentity(service.type),
    enabled: (query) => {
      if (status.enabledInPreferences) return true;
      if (service.type === TranslationType.DeepL) {
        return Boolean(status.implicitlyEnabledBy) && getLingueeWebDictionaryURL(query) !== undefined;
      }
      if (service.type === TranslationType.Youdao) {
        return (
          Boolean(status.implicitlyEnabledBy) && getYoudaoWebDictionaryURL(query) !== undefined && checkIsWord(query)
        );
      }
      return false;
    },
    createProvider: () => new builtinProviderClasses[service.type](),
  };
});
