/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getLangCode } from "@/core/language/utils";
import { genVolcanoSign } from "@/providers/shared/volcano-sign";
import { TranslationType } from "@/types/api";
import type { QueryInput, RequestOptions } from "@/types/query";
import { RequestError } from "@/utils/errors";
import { timedFetch } from "@/utils/http";
import { logError, logWarn } from "@/utils/logger";

import { BaseNonStreamingTranslateProvider } from "../base";

export interface VolcanoTranslateResult {
  TranslationList?: VolcanoTranslationList[];
  ResponseMetadata: VolcanoResponseMetaData;
}

interface VolcanoResponseMetaData {
  RequestId: string;
  Action: string;
  Version: Date;
  Service: string;
  Region: string;
  Error?: VolcanoError;
}

interface VolcanoTranslationList {
  Translation: string;
  DetectedSourceLanguage?: string;
}

interface VolcanoError {
  Code: string;
  Message: string;
}

/**
 * Volcengine Translate API.
 *
 * Docs: https://www.volcengine.com/docs/4640/65067
 */
export class VolcanoTranslateProvider extends BaseNonStreamingTranslateProvider {
  type = TranslationType.Volcano;

  protected async doTranslate(queryWordInfo: QueryInput, { signal }: RequestOptions = {}) {
    const { fromLanguage, toLanguage, word } = queryWordInfo;
    const from = getLangCode(fromLanguage, "volcanoLangCode");
    const to = getLangCode(toLanguage, "volcanoLangCode");

    const query = {
      Action: "TranslateText",
      Version: "2020-06-01",
    };
    const params = {
      SourceLanguage: from, // 若不配置此字段，则代表自动检测源语言
      TargetLanguage: to,
      TextList: [word], // 列表长度不超过 8，总文本长度不超过 5000 字符
      Category: "", // 默认使用通用翻译领域，无需填写
    };

    const signObject = genVolcanoSign(query, params);
    if (!signObject) {
      logWarn(this.type, "AccessKey or SecretKey is empty");
      throw new RequestError(TranslationType.Volcano, "Volcano AccessKey or SecretKey is empty", "");
    }

    const url = signObject.getUrl();
    const config = signObject.getConfig();

    const volcanoResult = await timedFetch<VolcanoTranslateResult>(url, {
      method: "POST",
      body: params,
      headers: config.headers,
      signal,
    });

    const volcanoError = volcanoResult.ResponseMetadata?.Error;

    if (volcanoError) {
      logError(this.type, `translate error: ${volcanoError.Message}`);
      throw new RequestError(TranslationType.Volcano, volcanoError.Message || "", volcanoError.Code || "");
    }

    if (!volcanoResult.TranslationList) {
      throw new Error("Volcano translate: no translation list");
    }

    const translations = volcanoResult.TranslationList[0].Translation.split("\n");

    return {
      type: TranslationType.Volcano,
      result: volcanoResult,
      translations,
      queryWordInfo,
    };
  }
}
