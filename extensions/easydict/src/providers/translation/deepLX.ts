/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getSharedCookies, type SourceLanguage, type TargetLanguage, translate } from "@deeplx/core";
import { Cache } from "@raycast/api";

import type { TranslationContent } from "@/core/content/types";
import { getLangCode } from "@/core/language/utils";
import { TranslationType } from "@/core/results/kinds";
import type { QueryInput, RequestOptions } from "@/core/results/types";
import { logTrace } from "@/shared/logger";
import { isRecord } from "@/shared/validation";

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
      const decoded: unknown = JSON.parse(value);
      if (
        !isRecord(decoded) ||
        typeof decoded.cookies !== "string" ||
        !decoded.cookies ||
        typeof decoded.timestamp !== "number" ||
        !Number.isFinite(decoded.timestamp)
      )
        return undefined;
      const { cookies, timestamp } = decoded;
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

  protected async doTranslate(queryWordInfo: QueryInput, { signal }: RequestOptions = {}): Promise<TranslationContent> {
    const { fromLanguage, toLanguage, word } = queryWordInfo;
    const sourceLang = getLangCode(fromLanguage, "deepLSourceId");
    const targetLang = getLangCode(toLanguage, "deepLTargetId") || getLangCode(toLanguage, "deepLSourceId");

    if (!sourceLang || !targetLang) {
      logTrace(this.type, `translate not support language: ${fromLanguage} --> ${toLanguage}`);
      return {
        kind: "translation",
        query: queryWordInfo,
        paragraphs: [],
      };
    }

    const cachedCookies = cookieCache.get();

    let translatedText: string;
    try {
      translatedText = await translate(word, targetLang as TargetLanguage, sourceLang as SourceLanguage, {
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

    return {
      kind: "translation",
      paragraphs: translatedText.split("\n"),
      query: queryWordInfo,
    };
  }
}
