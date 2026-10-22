/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { DetectionObservation } from "@/core/detect/types";
import { languageCatalog } from "@/core/language/catalog";
import { getLanguageFromProviderCode, isLanguageCode } from "@/core/language/utils";
import { LanguageDetectType } from "@/core/results/kinds";
import { requestBing } from "@/providers/shared/bing-request";

import { BaseDetectProvider, type DetectOptions } from "./base";
import { detectionObject, detectionString } from "./response";

export class BingDetectProvider extends BaseDetectProvider {
  type = LanguageDetectType.Bing;

  isEnabled() {
    return true;
  }

  protected async doDetect(text: string, options?: DetectOptions): Promise<DetectionObservation> {
    const { data } = await requestBing({
      text,
      fromLang: languageCatalog.auto.codes.bingLangCode,
      to: languageCatalog.en.codes.bingLangCode,
      signal: options?.signal,
    });
    if (!data) throw new Error("Bing detect: empty response");
    if (!Array.isArray(data)) throw new Error("Bing detect: invalid response");
    const response = detectionObject(data[0], "Bing detect: invalid response");
    const detected = detectionObject(response.detectedLanguage, "Bing detect: invalid response");
    const code = detectionString(detected.language, "Bing detect: invalid response");
    if (!code) throw new Error("Bing detect: invalid response");
    const language = getLanguageFromProviderCode(code, "bingLangCode");
    return { kind: "single", type: this.type, language: isLanguageCode(language) ? language : undefined };
  }
}
