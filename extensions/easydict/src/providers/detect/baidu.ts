/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import querystring from "node:querystring";

import { myPreferences } from "@/consts";
import type { DetectionObservation } from "@/core/detect/types";
import { getLanguageFromProviderCode, isLanguageCode } from "@/core/language/utils";
import { LanguageDetectType } from "@/core/results/kinds";
import { RequestError } from "@/shared/errors";
import { timedFetch } from "@/shared/http";

import { BaseDetectProvider, type DetectOptions } from "./base";
import { detectionNumber, detectionObject, detectionString } from "./response";

export class BaiduDetectProvider extends BaseDetectProvider {
  type = LanguageDetectType.Baidu;

  isEnabled() {
    return myPreferences.enableBaiduLanguageDetect;
  }

  protected async doDetect(text: string, options?: DetectOptions): Promise<DetectionObservation> {
    const response = detectionObject(
      await timedFetch<unknown>("https://fanyi.baidu.com/langdetect", {
        method: "POST",
        body: querystring.stringify({ query: text }),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: options?.signal,
      }),
    );
    const code = detectionNumber(response.error);
    if (code !== 0)
      throw new RequestError(this.type, response.msg === undefined ? "" : detectionString(response.msg), String(code));
    const language = getLanguageFromProviderCode(detectionString(response.lan), "baiduLangCode");
    return { kind: "single", type: this.type, language: isLanguageCode(language) ? language : undefined };
  }
}
