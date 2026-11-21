/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { TranslationContent } from "@/core/content/types";
import { getLangCode } from "@/core/language/utils";
import { TranslationType } from "@/core/results/kinds";
import type { QueryInput, RequestOptions } from "@/core/results/types";
import { ProviderConfig } from "@/providers/shared/config";
import { timedFetch } from "@/shared/http";
import { logTrace } from "@/shared/logger";
import { isRecord } from "@/shared/validation";

import { BaseNonStreamingTranslateProvider } from "./base";
import { invalidResponse } from "./response";

/**
 * Caiyun translate API. Cost time: 0.2s
 *
 * 彩云小译  https://open.caiyunapp.com/%E4%BA%94%E5%88%86%E9%92%9F%E5%AD%A6%E4%BC%9A%E5%BD%A9%E4%BA%91%E5%B0%8F%E8%AF%91_API
 */
export class CaiyunTranslateProvider extends BaseNonStreamingTranslateProvider {
  type = TranslationType.Caiyun;

  protected async doTranslate(queryWordInfo: QueryInput, { signal }: RequestOptions = {}): Promise<TranslationContent> {
    const { fromLanguage, toLanguage, word } = queryWordInfo;

    const url = "https://api.interpreter.caiyunai.com/v1/translator";
    const from = getLangCode(fromLanguage, "caiyunLangCode");
    const to = getLangCode(toLanguage, "caiyunLangCode");
    const trans_type = `${from}2${to}`; // "auto2xx";

    // Note that Caiyun Translate only supports these types of translation at present.
    const supportedTranslatType = ["zh2en", "zh2ja", "en2zh", "ja2zh"];
    if (!supportedTranslatType.includes(trans_type)) {
      logTrace(this.type, `translate not support language: ${fromLanguage} --> ${toLanguage}`);
      return { kind: "translation", query: queryWordInfo, paragraphs: [] };
    }

    const params = {
      source: word.split("\n"), // source can be text or array. if source is an array, it will be translated in parallel
      trans_type,
      detect: from === "auto",
    };
    const headers = {
      "content-type": "application/json",
      "x-authorization": "token " + ProviderConfig.caiyunToken,
    };

    const caiyunResult = await timedFetch<unknown>(url, {
      method: "POST",
      body: params,
      headers,
      signal,
    });

    if (
      !isRecord(caiyunResult) ||
      !Array.isArray(caiyunResult.target) ||
      !caiyunResult.target.every((text: unknown) => typeof text === "string")
    )
      throw invalidResponse(this.type);
    return { kind: "translation", query: queryWordInfo, paragraphs: caiyunResult.target };
  }
}
