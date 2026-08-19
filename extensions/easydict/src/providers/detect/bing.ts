/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { userAgent } from "@/consts";
import { autoDetectLanguageItem, englishLanguageItem } from "@/core/language/consts";
import { bingMap, getYoudaoLangCode } from "@/core/language/utils";
import { ensureBingConfig, getBingHost, incrementBingConfigCount } from "@/providers/shared/bing-config";
import { LanguageDetectType } from "@/types/api";
import { timedFetch } from "@/utils/http";

import type { DetectOptions } from "./base";
import { BaseDetectProvider } from "./base";

interface BingTranslateResult {
  detectedLanguage: { language: string; score: number };
  translations: unknown[];
}

export class BingDetectProvider extends BaseDetectProvider<BingTranslateResult> {
  type = LanguageDetectType.Bing;

  isEnabled(): boolean {
    return true;
  }

  protected async doDetect(text: string, options?: DetectOptions) {
    const bingConfig = await ensureBingConfig();
    const { IG, key, token } = bingConfig;
    const IIDString = incrementBingConfigCount();

    const data = {
      text,
      fromLang: autoDetectLanguageItem.bingLangCode,
      to: englishLanguageItem.bingLangCode,
      token,
      key,
    };

    const bingHost = getBingHost();
    const url = `https://${bingHost}/ttranslatev3?isVertical=1&IG=${IG}&IID=${IIDString}`;

    const { url: finalUrl, data: responseData } = await this.makeRequest(url, data, options?.signal);

    const newHost = new URL(finalUrl).host;
    if (newHost !== bingHost) {
      // Host mismatch detected; shared module handles host switching on next request.
    }

    if (!responseData) {
      throw new Error("Bing detect: empty response");
    }

    const responseArray = responseData as unknown[];
    const bingResult = responseArray[0] as BingTranslateResult | undefined;
    if (!bingResult?.detectedLanguage?.language) {
      throw new Error("Bing detect: invalid response");
    }

    const detectedLanguageCode = bingResult.detectedLanguage.language;
    const youdaoLangCode = getYoudaoLangCode(detectedLanguageCode, bingMap);

    return {
      type: LanguageDetectType.Bing,
      sourceLangCode: detectedLanguageCode,
      youdaoLangCode,
      confirmed: false,
      result: bingResult,
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
