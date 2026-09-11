/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */
import querystring from "node:querystring";

import { FetchError } from "ofetch";

import { getLangCode } from "@/core/language/utils";
import { ProviderConfig } from "@/providers/shared/config";
import { TranslationType } from "@/types/api";
import type { QueryInput, RequestOptions } from "@/types/query";
import { RequestError } from "@/utils/errors";
import { timedFetch } from "@/utils/http";
import { logTrace } from "@/utils/logger";

import { BaseNonStreamingTranslateProvider } from "./base";

export interface DeepLTranslateResult {
  translations: DeepLTranslationItem[];
}

export interface DeepLTranslationItem {
  detected_source_language: string;
  text: string;
}

/**
 * DeepL translate API. Cost time: > 1s
 *
 * https://www.deepl.com/zh/docs-api/translating-text
 */
export class DeepLTranslateProvider extends BaseNonStreamingTranslateProvider<DeepLTranslateResult> {
  type = TranslationType.DeepL;

  protected async doTranslate(queryWordInfo: QueryInput, { signal }: RequestOptions = {}) {
    const { fromLanguage, toLanguage, word } = queryWordInfo;
    const sourceLang = getLangCode(fromLanguage, "deepLSourceId");
    const targetLang = getLangCode(toLanguage, "deepLTargetId") || getLangCode(toLanguage, "deepLSourceId");

    // if language is not supported, return null
    if (!sourceLang || !targetLang) {
      logTrace(this.type, `translate not support language: ${fromLanguage} --> ${toLanguage}`);
      return {
        type: TranslationType.DeepL,
        result: undefined,
        translations: [],
        queryWordInfo,
      };
    }

    const deepLAuthKey = ProviderConfig.deepLAuthKey;

    if (!deepLAuthKey) {
      throw new RequestError(TranslationType.DeepL, "No deepL key", "");
    }

    // * deepL api free and deepL pro api use different url host.
    let url = deepLAuthKey.endsWith(":fx")
      ? "https://api-free.deepl.com/v2/translate"
      : "https://api.deepl.com/v2/translate";

    const deepLEndpoint = ProviderConfig.deepLEndpoint;
    if (deepLEndpoint.length > 0) {
      url = deepLEndpoint;
    }

    const params = {
      text: word,
      source_lang: sourceLang,
      target_lang: targetLang,
    };

    let deepLResult: DeepLTranslateResult;
    try {
      deepLResult = await timedFetch<DeepLTranslateResult>(url, {
        method: "POST",
        body: querystring.stringify(params),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `DeepL-Auth-Key ${deepLAuthKey}`,
        },
        signal,
      });
    } catch (error) {
      if (error instanceof FetchError) {
        if (error.status === 456) {
          throw new RequestError(TranslationType.DeepL, "Quota exceeded", "456");
        } else if (error.status === 403) {
          throw new RequestError(TranslationType.DeepL, "Authorization failed", "403");
        }
      }
      throw error;
    }

    const translatedText = deepLResult.translations[0].text;

    return {
      type: TranslationType.DeepL,
      result: deepLResult,
      translations: translatedText.split("\n"),
      queryWordInfo,
    };
  }
}
