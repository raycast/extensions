/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import querystring from "node:querystring";

import { myPreferences } from "@/consts";
import { baiduMap, getYoudaoLangCode, isValidLangCode } from "@/core/language/utils";
import { LanguageDetectType } from "@/types/api";
import { RequestError } from "@/utils/errors";
import { timedFetch } from "@/utils/http";
import { logError } from "@/utils/logger";

import type { DetectOptions } from "./base";
import { BaseDetectProvider } from "./base";

interface BaiduWebLanguageDetect {
  error?: number;
  msg?: string;
  lan?: string;
}

export class BaiduDetectProvider extends BaseDetectProvider<BaiduWebLanguageDetect> {
  type = LanguageDetectType.Baidu;

  isEnabled(): boolean {
    return myPreferences.enableBaiduLanguageDetect;
  }

  protected async doDetect(text: string, options?: DetectOptions) {
    const url = "https://fanyi.baidu.com/langdetect";
    const params = { query: text };

    const response = await timedFetch<BaiduWebLanguageDetect>(url, {
      method: "POST",
      body: querystring.stringify(params),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      signal: options?.signal,
    });

    if (response.error === 0) {
      const baiduLanguageId = response.lan || "";
      const youdaoLanguageId = getYoudaoLangCode(baiduLanguageId, baiduMap);
      const isConfirmed = isValidLangCode(youdaoLanguageId);

      return {
        type: LanguageDetectType.Baidu,
        sourceLangCode: baiduLanguageId,
        youdaoLangCode: youdaoLanguageId,
        confirmed: isConfirmed,
        result: response,
      };
    }

    const errorInfo = new RequestError(
      LanguageDetectType.Baidu,
      response.msg || "",
      response.error ? response.error.toString() : "",
    );
    logError(this.type, `detect error: ${response.msg}`);
    throw errorInfo;
  }
}
