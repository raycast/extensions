/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getYoudaoLangCode, volcanoMap } from "@/core/language/utils";
import { hasVolcanoAppKey } from "@/providers/shared/config";
import { genVolcanoSign } from "@/providers/shared/volcano-sign";
import { LanguageDetectType } from "@/types/api";
import { RequestError } from "@/utils/errors";
import { timedFetch } from "@/utils/http";
import { logError, logWarn } from "@/utils/logger";

import type { DetectOptions } from "./base";
import { BaseDetectProvider } from "./base";

interface VolcanoDetectResult {
  DetectedLanguageList: { Language: string; Confidence: number }[];
  ResponseMetaData: {
    Error?: { Code: string; Message: string };
  };
}

export class VolcanoDetectProvider extends BaseDetectProvider<VolcanoDetectResult> {
  type = LanguageDetectType.Volcano;

  isEnabled(): boolean {
    if (!hasVolcanoAppKey()) {
      logWarn(this.type, "detect has no app key");
      return false;
    }
    return true;
  }

  protected async doDetect(text: string, options?: DetectOptions) {
    const query = { Action: "LangDetect", Version: "2020-06-01" };
    const params = { TextList: [text] };

    const signObject = genVolcanoSign(query, params);
    if (!signObject) {
      throw new RequestError(this.type, "AccessKey or SecretKey is empty", "");
    }

    const url = signObject.getUrl();
    const config = signObject.getConfig();

    const volcanoDetectResult = await timedFetch<VolcanoDetectResult>(url, {
      method: "POST",
      body: params,
      headers: config.headers,
      signal: options?.signal,
    });

    const volcanoError = volcanoDetectResult.ResponseMetaData.Error;
    if (volcanoError) {
      logError(this.type, `detect error: ${volcanoError.Message}`);
      throw new RequestError(LanguageDetectType.Volcano, volcanoError.Message || "", volcanoError.Code || "");
    }

    const detectedLanguage = volcanoDetectResult.DetectedLanguageList[0];
    const volcanoLangCode = detectedLanguage.Language;
    const youdaoLangCode = getYoudaoLangCode(volcanoLangCode, volcanoMap);
    const isConfirmed = detectedLanguage.Confidence > 0.5;

    return {
      type: LanguageDetectType.Volcano,
      sourceLangCode: volcanoLangCode,
      youdaoLangCode,
      confirmed: isConfirmed,
      result: volcanoDetectResult,
    };
  }
}
