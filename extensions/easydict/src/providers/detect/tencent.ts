/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { DetectionObservation } from "@/core/detect/types";
import { getLanguageFromProviderCode, isLanguageCode } from "@/core/language/utils";
import { LanguageDetectType } from "@/core/results/kinds";
import { hasTencentAppKey } from "@/providers/shared/config";
import { tencentSign } from "@/providers/shared/tencent-sign";
import { RequestError } from "@/shared/errors";
import { timedFetch } from "@/shared/http";
import { logWarn } from "@/shared/logger";

import { BaseDetectProvider, type DetectOptions } from "./base";
import { detectionObject, detectionString } from "./response";

export class TencentDetectProvider extends BaseDetectProvider {
  type = LanguageDetectType.Tencent;

  isEnabled() {
    if (!hasTencentAppKey()) {
      logWarn(this.type, "detect has no app key");
      return false;
    }
    return true;
  }

  protected async doDetect(text: string, options?: DetectOptions): Promise<DetectionObservation> {
    const payload = { Text: text, ProjectId: 0 };
    const { url, headers } = tencentSign("LanguageDetect", payload);
    const data = detectionObject(
      await timedFetch<unknown>(url, { method: "POST", body: payload, headers, signal: options?.signal }),
    );
    const response = detectionObject(data.Response);
    if (response.Error !== undefined) {
      const error = detectionObject(response.Error);
      throw new RequestError(this.type, detectionString(error.Message));
    }
    const language = getLanguageFromProviderCode(detectionString(response.Lang), "tencentDetectCode");
    return { kind: "single", type: this.type, language: isLanguageCode(language) ? language : undefined };
  }
}
