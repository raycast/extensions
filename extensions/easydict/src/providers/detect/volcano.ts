/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { DetectionObservation } from "@/core/detect/types";
import { getLanguageFromProviderCode, isLanguageCode } from "@/core/language/utils";
import { LanguageDetectType } from "@/core/results/kinds";
import { hasVolcanoAppKey } from "@/providers/shared/config";
import { genVolcanoSign } from "@/providers/shared/volcano-sign";
import { RequestError } from "@/shared/errors";
import { timedFetch } from "@/shared/http";
import { logWarn } from "@/shared/logger";

import { BaseDetectProvider, type DetectOptions } from "./base";
import { detectionNumber, detectionObject, detectionString } from "./response";

export class VolcanoDetectProvider extends BaseDetectProvider {
  type = LanguageDetectType.Volcano;

  isEnabled() {
    if (!hasVolcanoAppKey()) {
      logWarn(this.type, "detect has no app key");
      return false;
    }
    return true;
  }

  protected async doDetect(text: string, options?: DetectOptions): Promise<DetectionObservation> {
    const params = { TextList: [text] };
    const sign = genVolcanoSign({ Action: "LangDetect", Version: "2020-06-01" }, params);
    if (!sign) throw new RequestError(this.type, "AccessKey or SecretKey is empty", "");
    const response = detectionObject(
      await timedFetch<unknown>(sign.getUrl(), {
        method: "POST",
        body: params,
        headers: sign.getConfig().headers,
        signal: options?.signal,
      }),
    );
    const metadata = detectionObject(response.ResponseMetaData);
    if (metadata.Error !== undefined) {
      const error = detectionObject(metadata.Error);
      throw new RequestError(this.type, detectionString(error.Message), detectionString(error.Code));
    }
    if (!Array.isArray(response.DetectedLanguageList)) throw new Error("Volcano detect: invalid language list");
    const detected = detectionObject(response.DetectedLanguageList[0]);
    const language = getLanguageFromProviderCode(detectionString(detected.Language), "volcanoLangCode");
    return {
      kind: "single",
      type: this.type,
      language: isLanguageCode(language) ? language : undefined,
      confidence: detectionNumber(detected.Confidence),
    };
  }
}
