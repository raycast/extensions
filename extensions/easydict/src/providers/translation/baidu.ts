/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getLangCode } from "@/core/language/utils";
import { ProviderConfig } from "@/providers/shared/config";
import { TranslationType } from "@/types/api";
import type { QueryInput, RequestOptions } from "@/types/query";
import { md5 } from "@/utils/crypto";
import { RequestError } from "@/utils/errors";
import { timedFetch } from "@/utils/http";
import { logError, logWarn } from "@/utils/logger";

import { BaseNonStreamingTranslateProvider } from "./base";

export interface BaiduTranslateResult {
  from?: string;
  to?: string;
  trans_result?: BaiduTranslateItem[];
  error_code?: string;
  error_msg?: string;
}

export interface BaiduTranslateItem {
  src: string;
  dst: string;
}

export interface BaiduWebLanguageDetect {
  error?: number;
  msg?: string;
  lan?: string;
}

/**
 * Baidu translate. Cost time: ~0.4s
 *
 * 百度翻译 API https://fanyi-api.baidu.com/doc/21
 */
export class BaiduTranslateProvider extends BaseNonStreamingTranslateProvider {
  type = TranslationType.Baidu;

  protected async doTranslate(queryWordInfo: QueryInput, { signal }: RequestOptions = {}) {
    const { fromLanguage, toLanguage, word } = queryWordInfo;
    const from = getLangCode(fromLanguage, "baiduLangCode");
    const to = getLangCode(toLanguage, "baiduLangCode");

    if (!from || !to) {
      logWarn(this.type, `translate not support language: ${fromLanguage} to ${toLanguage}`);
      return {
        type: TranslationType.Baidu,
        result: undefined,
        translations: [],
        queryWordInfo,
      };
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

    const baiduResult = await timedFetch<BaiduTranslateResult>(url, { params, signal });

    if (baiduResult.trans_result) {
      const translations = baiduResult.trans_result.map((item) => item.dst);

      return {
        type: TranslationType.Baidu,
        result: baiduResult,
        translations,
        queryWordInfo,
      };
    }

    logError(this.type, `translate error: ${baiduResult.error_msg}`);
    throw new RequestError(TranslationType.Baidu, baiduResult.error_msg || "", baiduResult.error_code || "");
  }
}
