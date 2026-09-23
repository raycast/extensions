/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getSharedCookies, type TargetLanguage, translate } from "@deeplx/core";
import { Cache } from "@raycast/api";

import { getLangCode } from "@/core/language/utils";
import { TranslationType } from "@/types/api";
import type { QueryInput, RequestOptions } from "@/types/query";
import { logTrace } from "@/utils/logger";

import { BaseNonStreamingTranslateProvider } from "./base";

class CookieCacheManager {
  private cache = new Cache();
  private readonly CACHE_KEY = "DeepLXCookies";
  // 12 hours expiration
  private readonly TTL_MS = 12 * 60 * 60 * 1000;

  get(): string | undefined {
    const value = this.cache.get(this.CACHE_KEY);
    if (!value) return undefined;

    try {
      const { cookies, timestamp } = JSON.parse(value) as { cookies: string; timestamp: number };
      if (Date.now() - timestamp > this.TTL_MS) {
        logTrace("DeepLX", "cached cookies expired");
        return undefined;
      }
      return cookies;
    } catch {
      return undefined;
    }
  }

  set(cookies: string): void {
    this.cache.set(
      this.CACHE_KEY,
      JSON.stringify({
        cookies,
        timestamp: Date.now(),
      }),
    );
  }

  clear(): void {
    this.cache.remove(this.CACHE_KEY);
  }

  updateIfChanged(cachedCookies: string | undefined): void {
    const currentCookies = getSharedCookies();
    if (currentCookies && currentCookies !== cachedCookies) {
      this.set(currentCookies);
    }
  }
}

const cookieCache = new CookieCacheManager();

/**
 * DeepLX translate API - Free DeepL translation using deeplx package
 * Cost time: ~1.5-2s (First time need get cookie: 5s)
 *
 * Uses the unofficial but free DeepL API client
 * https://github.com/un-ts/deeplx
 */
export class DeepLXTranslateProvider extends BaseNonStreamingTranslateProvider {
  type = TranslationType.DeepLX;

  protected async doTranslate(queryWordInfo: QueryInput, { signal }: RequestOptions = {}) {
    const { fromLanguage, toLanguage, word } = queryWordInfo;
    const sourceLang = getLangCode(fromLanguage, "deepLSourceId");
    const targetLang = getLangCode(toLanguage, "deepLTargetId") || getLangCode(toLanguage, "deepLSourceId");

    if (!sourceLang || !targetLang) {
      logTrace(this.type, `translate not support language: ${fromLanguage} --> ${toLanguage}`);
      return {
        type: TranslationType.DeepLX,
        result: undefined,
        translations: [],
        queryWordInfo,
      };
    }

    const cachedCookies = cookieCache.get();

    let translatedText: string;
    try {
      translatedText = await translate(word, targetLang as TargetLanguage, sourceLang as TargetLanguage, {
        signal,
        cookies: cachedCookies,
      });
    } catch (e) {
      // If the request fails, it might be due to an invalid cookie. Clear it so the next request starts fresh.
      if (!signal?.aborted) {
        cookieCache.clear();
      }
      throw e;
    }

    cookieCache.updateIfChanged(cachedCookies);

    // Create a result object similar to DeepL API structure
    const deepLXResult = {
      translations: [
        {
          detected_source_language: sourceLang,
          text: translatedText,
        },
      ],
    };

    return {
      type: TranslationType.DeepLX,
      result: deepLXResult,
      translations: translatedText.split("\n"),
      queryWordInfo,
    };
  }
}
