/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { TranslationContent } from "@/core/content/types";
import { getLangCode } from "@/core/language/utils";
import { TranslationType } from "@/core/results/kinds";
import type { QueryInput, RequestOptions } from "@/core/results/types";
import { genVolcanoSign } from "@/providers/shared/volcano-sign";
import { RequestError } from "@/shared/errors";
import { timedFetch } from "@/shared/http";
import { logError, logWarn } from "@/shared/logger";
import { isRecord } from "@/shared/validation";

import { BaseNonStreamingTranslateProvider } from "../base";
import { invalidResponse } from "../response";

/**
 * Volcengine Translate API.
 *
 * Docs: https://www.volcengine.com/docs/4640/65067
 */
export class VolcanoTranslateProvider extends BaseNonStreamingTranslateProvider {
  type = TranslationType.Volcano;

  protected async doTranslate(queryWordInfo: QueryInput, { signal }: RequestOptions = {}): Promise<TranslationContent> {
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

    const volcanoResult = await timedFetch<unknown>(url, {
      method: "POST",
      body: params,
      headers: config.headers,
      signal,
    });

    if (!isRecord(volcanoResult)) throw invalidResponse(this.type);
    if (volcanoResult.ResponseMetadata !== undefined) {
      if (!isRecord(volcanoResult.ResponseMetadata)) throw invalidResponse(this.type);
      const error = volcanoResult.ResponseMetadata.Error;
      if (error !== undefined) {
        if (!isRecord(error) || typeof error.Message !== "string" || typeof error.Code !== "string")
          throw invalidResponse(this.type);
        logError(this.type, `translate error: ${error.Message}`);
        throw new RequestError(this.type, error.Message, error.Code);
      }
    }
    if (volcanoResult.TranslationList === undefined) throw new Error("Volcano translate: no translation list");
    const translated = Array.isArray(volcanoResult.TranslationList) ? volcanoResult.TranslationList[0] : undefined;
    if (!isRecord(translated) || typeof translated.Translation !== "string") throw invalidResponse(this.type);
    return { kind: "translation", query: queryWordInfo, paragraphs: translated.Translation.split("\n") };
  }
}
