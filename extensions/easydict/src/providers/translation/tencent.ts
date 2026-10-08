/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { TranslationContent } from "@/core/content/types";
import { getLangCode } from "@/core/language/utils";
import { TranslationType } from "@/core/results/kinds";
import type { QueryInput, RequestOptions } from "@/core/results/types";
import { tencentSign } from "@/providers/shared/tencent-sign";
import { RequestError } from "@/shared/errors";
import { timedFetch } from "@/shared/http";
import { logError, logWarn } from "@/shared/logger";
import { isRecord } from "@/shared/validation";

import { BaseNonStreamingTranslateProvider } from "./base";
import { invalidResponse } from "./response";

/**
 * Tencent translate, use timedFetch with manual TC3-HMAC-SHA256 signing.
 *
 * Docs: https://cloud.tencent.com/document/api/551/15619
 */
export class TencentTranslateProvider extends BaseNonStreamingTranslateProvider {
  type = TranslationType.Tencent;

  protected async doTranslate(queryWordInfo: QueryInput, { signal }: RequestOptions = {}): Promise<TranslationContent> {
    const { fromLanguage, toLanguage, word } = queryWordInfo;
    const from = getLangCode(fromLanguage, "tencentLangCode");
    const to = getLangCode(toLanguage, "tencentLangCode");

    if (!from || !to) {
      logWarn(this.type, `translate not support language: ${fromLanguage} --> ${toLanguage}`);
      return { kind: "translation", query: queryWordInfo, paragraphs: [] };
    }

    const payload = {
      SourceText: word,
      Source: from,
      Target: to,
      ProjectId: 0,
    };

    const { url, headers } = tencentSign("TextTranslate", payload);

    const data = await timedFetch<unknown>(url, {
      method: "POST",
      body: payload,
      headers,
      signal,
    });

    if (!isRecord(data) || !isRecord(data.Response)) throw invalidResponse(this.type);
    const response = data.Response;
    if (response.Error !== undefined) {
      if (!isRecord(response.Error) || typeof response.Error.Message !== "string") throw invalidResponse(this.type);
      logError(this.type, `translate error: ${response.Error.Message}`);
      throw new RequestError(this.type, response.Error.Message);
    }
    if (response.TargetText !== undefined && typeof response.TargetText !== "string") throw invalidResponse(this.type);
    return { kind: "translation", query: queryWordInfo, paragraphs: (response.TargetText ?? "").split("\n") };
  }
}
