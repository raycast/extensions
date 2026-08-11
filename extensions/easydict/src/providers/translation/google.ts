/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import querystring from "node:querystring";

import { userAgent } from "@/consts";
import { getLangCode } from "@/core/language/utils";
import { TranslationType } from "@/types/api";
import type { QueryInput, RequestOptions } from "@/types/query";
import { timedFetch } from "@/utils/http";
import { logTrace } from "@/utils/logger";
import { trimTextLength, unescapeHtml } from "@/utils/text";

import { BaseNonStreamingTranslateProvider } from "./base";

export class GoogleTranslateProvider extends BaseNonStreamingTranslateProvider {
  type = TranslationType.Google;

  /**
   * Use crawler to get google web translate. Only simple translate result.
   *
   * * Note: max translated text length should <= 1830
   * * Otherwise will throw error: "400. That's an error. Your client has issued a malformed or illegal request. That's all we know."
   *
   * From https://github.com/roojay520/bobplugin-google-translate/blob/master/src/google-translate-mobile.ts
   * Another wild google translate api: http://translate.google.com/translate_a/single?client=gtx&dt=t&dj=1&ie=UTF-8&sl=auto&tl=zh_TW&q=good
   */
  protected async doTranslate(queryWordInfo: QueryInput, { signal }: RequestOptions = {}) {
    const fromLanguageId = getLangCode(queryWordInfo.fromLanguage, "googleLangCode");
    const toLanguageId = getLangCode(queryWordInfo.toLanguage, "googleLangCode");
    const word = trimTextLength(queryWordInfo.word);
    const data = {
      sl: fromLanguageId,
      tl: toLanguageId,
      hl: toLanguageId,
      q: word,
    };

    const headers = {
      "User-Agent": userAgent,
    };
    const url = `https://translate.google.com/m?${querystring.stringify(data)}`;
    logTrace(this.type, `web url: ${url}`);

    const html = await timedFetch(url, {
      headers,
      signal,
      responseType: "text",
    });

    // <div class="result-container">好的</div>
    const match = html.match(/<div class="result-container">(.*?)<\/div>/s);
    let translation = match?.[1]?.trim() ?? "";

    // Decode HTML entities (e.g., &quot;, &#39;, &amp;)
    translation = unescapeHtml(translation);

    const translations = translation.split("\n");

    return {
      type: TranslationType.Google,
      result: { translatedText: translation },
      translations,
      queryWordInfo,
    };
  }
}
