/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { TranslationContent } from "@/core/content/types";
import { getLangCode } from "@/core/language/utils";
import { TranslationType } from "@/core/results/kinds";
import type { QueryInput, RequestOptions } from "@/core/results/types";
import { ProviderConfig } from "@/providers/shared/config";
import { md5 } from "@/shared/crypto";
import { RequestError } from "@/shared/errors";
import { timedFetch } from "@/shared/http";
import { logError, logWarn } from "@/shared/logger";
import { isRecord } from "@/shared/validation";

import { BaseNonStreamingTranslateProvider } from "./base";
import { invalidResponse } from "./response";

/**
 * Baidu translate. Cost time: ~0.4s
 *
 * 百度翻译 API https://fanyi-api.baidu.com/doc/21
 */
export class BaiduTranslateProvider extends BaseNonStreamingTranslateProvider {
  type = TranslationType.Baidu;

  protected async doTranslate(queryWordInfo: QueryInput, { signal }: RequestOptions = {}): Promise<TranslationContent> {
    const { fromLanguage, toLanguage, word } = queryWordInfo;
    const from = getLangCode(fromLanguage, "baiduLangCode");
    const to = getLangCode(toLanguage, "baiduLangCode");

    if (!from || !to) {
      logWarn(this.type, `translate not support language: ${fromLanguage} to ${toLanguage}`);
      return { kind: "translation", query: queryWordInfo, paragraphs: [] };
    }

    const baiduAppId = ProviderConfig.baiduAppId;
    const baiduAppSecret = ProviderConfig.baiduAppSecret;

    const salt = Math.round(new Date().getTime() / 1000);
    const md5Content = baiduAppId + word + salt + baiduAppSecret;
    const sign = md5(md5Content);
    const url = "https://fanyi-api.baidu.com/api/trans/vip/translate";
    const encodeQueryText = Buffer.from(word, "utf8").toString();
    const params = {
      q: encodeQueryText,
      from: from,
      to: to,
      appid: baiduAppId,
      salt: salt,
      sign: sign,
    };

    const baiduResult = await timedFetch<unknown>(url, { params, signal });

    if (!isRecord(baiduResult)) throw invalidResponse(this.type);
    if (baiduResult.trans_result !== undefined) {
      if (!Array.isArray(baiduResult.trans_result)) throw invalidResponse(this.type);
      const paragraphs = baiduResult.trans_result.map((item: unknown) => {
        if (!isRecord(item) || typeof item.dst !== "string") throw invalidResponse(this.type);
        return item.dst;
      });
      return { kind: "translation", query: queryWordInfo, paragraphs };
    }
    if (
      typeof baiduResult.error_msg !== "string" ||
      (baiduResult.error_code !== undefined && typeof baiduResult.error_code !== "string")
    )
      throw invalidResponse(this.type);
    logError(this.type, `translate error: ${baiduResult.error_msg}`);
    throw new RequestError(this.type, baiduResult.error_msg, baiduResult.error_code ?? "");
  }
}
