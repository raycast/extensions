/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getLangCode } from "@/core/language/utils";
import { type TencentError, tencentSign } from "@/providers/shared/tencent-sign";
import { TranslationType } from "@/types/api";
import type { QueryInput, RequestOptions } from "@/types/query";
import { RequestError } from "@/utils/errors";
import { timedFetch } from "@/utils/http";
import { logError, logWarn } from "@/utils/logger";

import { BaseNonStreamingTranslateProvider } from "./base";

interface TextTranslateResponse {
  /**
   * 翻译后的文本
   */
  TargetText?: string;
  /**
   * 源语言，详见入参Source
   */
  Source?: string;
  /**
   * 目标语言，详见入参Target
   */
  Target?: string;
  /**
   * 本次翻译消耗的字符数
   */
  UsedAmount?: number;
  /**
   * 唯一请求 ID，由服务端生成，每次请求都会返回（若请求因其他原因未能抵达服务端，则该次请求不会获得 RequestId）。定位问题时需要提供该次请求的 RequestId。
   */
  RequestId?: string;
}

export interface TencentTranslateResult extends TextTranslateResponse {
  Error: TencentError;
}

/**
 * Tencent translate, use timedFetch with manual TC3-HMAC-SHA256 signing.
 *
 * Docs: https://cloud.tencent.com/document/api/551/15619
 */
export class TencentTranslateProvider extends BaseNonStreamingTranslateProvider {
  type = TranslationType.Tencent;

  protected async doTranslate(queryWordInfo: QueryInput, { signal }: RequestOptions = {}) {
    const { fromLanguage, toLanguage, word } = queryWordInfo;
    const from = getLangCode(fromLanguage, "tencentLangCode");
    const to = getLangCode(toLanguage, "tencentLangCode");

    if (!from || !to) {
      logWarn(this.type, `translate not support language: ${fromLanguage} --> ${toLanguage}`);
      return {
        type: TranslationType.Tencent,
        result: undefined,
        translations: [],
        queryWordInfo,
      };
    }

    const payload = {
      SourceText: word,
      Source: from,
      Target: to,
      ProjectId: 0,
    };

    const { url, headers } = tencentSign("TextTranslate", payload);

    const data = await timedFetch<{ Response: TencentTranslateResult }>(url, {
      method: "POST",
      body: payload,
      headers,
      signal,
    });

    const tencentResult = data.Response;

    const error = tencentResult.Error;
    if (error) {
      logError(this.type, `translate error: ${error.Message}`);
      throw new RequestError(TranslationType.Tencent, error.Message);
    }

    const targetText = tencentResult.TargetText || "";
    const translations = targetText.split("\n");

    return {
      type: TranslationType.Tencent,
      result: tencentResult,
      translations,
      queryWordInfo,
    };
  }
}
