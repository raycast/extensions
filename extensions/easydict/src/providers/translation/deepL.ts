/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */
import querystring from "node:querystring";

import { FetchError } from "ofetch";

import type { TranslationContent } from "@/core/content/types";
import { getLangCode } from "@/core/language/utils";
import { TranslationType } from "@/core/results/kinds";
import type { QueryInput, RequestOptions } from "@/core/results/types";
import { ProviderConfig } from "@/providers/shared/config";
import { RequestError } from "@/shared/errors";
import { timedFetch } from "@/shared/http";
import { logTrace } from "@/shared/logger";
import { isRecord } from "@/shared/validation";

import { BaseNonStreamingTranslateProvider } from "./base";
import { invalidResponse } from "./response";

/**
 * DeepL translate API. Cost time: > 1s
 *
 * https://www.deepl.com/zh/docs-api/translating-text
 */
export class DeepLTranslateProvider extends BaseNonStreamingTranslateProvider {
  type = TranslationType.DeepL;

  protected async doTranslate(queryWordInfo: QueryInput, { signal }: RequestOptions = {}): Promise<TranslationContent> {
    const { fromLanguage, toLanguage, word } = queryWordInfo;
    const sourceLang = getLangCode(fromLanguage, "deepLSourceId");
    const targetLang = getLangCode(toLanguage, "deepLTargetId") || getLangCode(toLanguage, "deepLSourceId");

    // if language is not supported, return null
    if (!sourceLang || !targetLang) {
      logTrace(this.type, `translate not support language: ${fromLanguage} --> ${toLanguage}`);
      return { kind: "translation", query: queryWordInfo, paragraphs: [] };
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

    let deepLResult: unknown;
    try {
      deepLResult = await timedFetch<unknown>(url, {
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

    const translated =
      isRecord(deepLResult) && Array.isArray(deepLResult.translations) ? deepLResult.translations[0] : undefined;
    if (!isRecord(translated) || typeof translated.text !== "string") throw invalidResponse(this.type);
    return { kind: "translation", query: queryWordInfo, paragraphs: translated.text.split("\n") };
  }
}
