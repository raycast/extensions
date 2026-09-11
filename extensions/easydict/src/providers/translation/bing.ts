/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { userAgent } from "@/consts";
import { getLangCode } from "@/core/language/utils";
import {
  ensureBingConfig,
  getBingHost,
  incrementBingConfigCount,
  requestBingConfig,
} from "@/providers/shared/bing-config";
import { TranslationType } from "@/types/api";
import type { QueryInput, RequestOptions, TranslationResult } from "@/types/query";
import { RequestError } from "@/utils/errors";
import { timedFetch } from "@/utils/http";
import { logWarn } from "@/utils/logger";

import { BaseNonStreamingTranslateProvider } from "./base";

export interface BingTranslateResult {
  detectedLanguage: BingDetectedLanguage;
  translations: BingTranslation[];
}

interface BingDetectedLanguage {
  language: string;
  score: number;
}

interface BingTranslation {
  text: string;
  to: string;
  sentLen: BingSentLen;
  transliteration?: BingTransliteration;
}

interface BingSentLen {
  srcSentLen: number[];
  transSentLen: number[];
}

interface BingTransliteration {
  script: string;
  text: string;
}

/**
 * Request Microsoft Bing Web Translator.
 */
export class BingTranslateProvider extends BaseNonStreamingTranslateProvider {
  type = TranslationType.Bing;

  protected async doTranslate(queryWordInfo: QueryInput, options: RequestOptions = {}): Promise<TranslationResult> {
    return this.doTranslateInternal(queryWordInfo, options, 0);
  }

  private async doTranslateInternal(
    queryWordInfo: QueryInput,
    { signal }: RequestOptions = {},
    retryCount: number,
  ): Promise<TranslationResult> {
    const { fromLanguage, toLanguage, word } = queryWordInfo;
    const fromLang = getLangCode(fromLanguage, "bingLangCode") ?? "";
    const toLang = getLangCode(toLanguage, "bingLangCode") ?? "";

    const bingConfig = await ensureBingConfig();
    const { IG, key, token } = bingConfig;
    const IIDString = incrementBingConfigCount();

    const data = {
      text: word,
      fromLang: fromLang,
      to: toLang,
      token: token,
      key: key,
    };

    const bingHost = getBingHost();
    const url = `https://${bingHost}/ttranslatev3?isVertical=1&IG=${IG}&IID=${IIDString}`;

    const { url: finalUrl, data: responseData } = await this.makeRequest(url, data, signal);

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

    const responseArray = responseData as unknown[];
    const bingTranslateResult = responseArray[0] as BingTranslateResult | undefined;
    if (!bingTranslateResult?.translations?.length) {
      throw new RequestError(TranslationType.Bing, "Bing translate response is invalid");
    }

    const translations = bingTranslateResult.translations[0].text.split("\n");

    return {
      type: TranslationType.Bing,
      queryWordInfo,
      result: bingTranslateResult,
      translations,
    };
  }

  private async makeRequest(
    requestUrl: string,
    data: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<{ url: string; data: unknown }> {
    const response = await timedFetch.raw(requestUrl, {
      method: "POST",
      body: new URLSearchParams(data).toString(),
      headers: {
        "User-Agent": userAgent,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      redirect: "manual",
      signal,
    });

    const finalUrl = response.url;

    // Handle redirect manually - POST body needs to be resent
    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get("location");
      if (redirectUrl) {
        return this.makeRequest(redirectUrl, data, signal);
      }
    }

    return { url: finalUrl, data: response._data };
  }
}
