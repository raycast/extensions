/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { TranslationContent } from "@/core/content/types";
import { getLangCode } from "@/core/language/utils";
import { TranslationType } from "@/core/results/kinds";
import type { QueryInput, RequestOptions } from "@/core/results/types";
import { getBingHost, requestBingConfig } from "@/providers/shared/bing-config";
import { requestBing } from "@/providers/shared/bing-request";
import { RequestError } from "@/shared/errors";
import { logWarn } from "@/shared/logger";
import { isRecord } from "@/shared/validation";

import { BaseNonStreamingTranslateProvider } from "./base";

/**
 * Request Microsoft Bing Web Translator.
 */
export class BingTranslateProvider extends BaseNonStreamingTranslateProvider {
  type = TranslationType.Bing;

  protected async doTranslate(queryWordInfo: QueryInput, options: RequestOptions = {}): Promise<TranslationContent> {
    return this.doTranslateInternal(queryWordInfo, options, 0);
  }

  private async doTranslateInternal(
    queryWordInfo: QueryInput,
    { signal }: RequestOptions = {},
    retryCount: number,
  ): Promise<TranslationContent> {
    const { fromLanguage, toLanguage, word } = queryWordInfo;
    const fromLang = getLangCode(fromLanguage, "bingLangCode") ?? "";
    const toLang = getLangCode(toLanguage, "bingLangCode") ?? "";

    const { url: finalUrl, data: responseData } = await requestBing({
      text: word,
      fromLang,
      to: toLang,
      signal,
    });

    // Get new host
    const newBingHost = new URL(finalUrl).host;
    const currentBingHost = getBingHost();
    // If bing translate response is empty, may be ip has been changed, bing tld is not correct, so check ip again, then request again.
    if (!responseData) {
      if (currentBingHost !== newBingHost && retryCount < 3) {
        logWarn(
          this.type,
          `translate response is empty, change to use new host: ${currentBingHost}, then request again, retryCount: ${retryCount}`,
        );
        const newConfig = await requestBingConfig();
        if (newConfig) {
          return this.doTranslateInternal(queryWordInfo, { signal }, retryCount + 1);
        }
        throw new RequestError(TranslationType.Bing, "Bing translate response is empty");
      }
      throw new RequestError(TranslationType.Bing, "Bing translate response is empty");
    }

    const first = Array.isArray(responseData) ? responseData[0] : undefined;
    const translated = isRecord(first) && Array.isArray(first.translations) ? first.translations[0] : undefined;
    if (!isRecord(translated) || typeof translated.text !== "string") {
      throw new RequestError(TranslationType.Bing, "Bing translate response is invalid", "INVALID_RESPONSE");
    }
    return { kind: "translation", query: queryWordInfo, paragraphs: translated.text.split("\n") };
  }
}
