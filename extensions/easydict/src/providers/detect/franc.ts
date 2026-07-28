/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { francAll } from "franc";

import type { DetectedLangModel } from "@/core/detect/types";
import { isPreferredLanguage } from "@/core/detect/utils";
import { languageItemList } from "@/core/language/consts";
import { getLanguageItem, getLanguageItemFromFrancCode } from "@/core/language/utils";
import { LanguageDetectType } from "@/types/api";

import type { DetectOptions } from "./base";
import { BaseDetectProvider } from "./base";

export class FrancDetectProvider extends BaseDetectProvider {
  type = LanguageDetectType.Franc;
  isLocal = true;

  isEnabled(): boolean {
    return true;
  }

  protected async doDetect(text: string, options?: DetectOptions) {
    return francLanguageDetect(text, options?.confirmedConfidence);
  }
}

/**
 * Use franc to detect text language (offline, n-gram based).
 */
export function francLanguageDetect(text: string, confirmedConfidence = 0.8): DetectedLangModel {
  let detectedLanguageId = "auto";
  let confirmed = false;

  const onlyFrancLanguageIdList = languageItemList.map((item) => item.francLangCode);
  const francDetectLanguageList = francAll(text, { minLength: 2, only: onlyFrancLanguageIdList });

  const detectedYoudaoLanguageArray: [string, number][] = francDetectLanguageList.map((languageTuple) => {
    const [francLanguageId, confidence] = languageTuple;
    const youdaoLanguageId = getLanguageItemFromFrancCode(francLanguageId).youdaoLangCode;
    return [youdaoLanguageId, confidence];
  });

  for (const [languageId, confidence] of detectedYoudaoLanguageArray) {
    if (confidence > confirmedConfidence && isPreferredLanguage(languageId)) {
      detectedLanguageId = languageId;
      confirmed = true;
      break;
    }
  }

  if (!confirmed) {
    [detectedLanguageId] = detectedYoudaoLanguageArray[0];
  }

  return {
    type: LanguageDetectType.Franc,
    sourceLangCode: getLanguageItem(detectedLanguageId).francLangCode,
    youdaoLangCode: detectedLanguageId,
    confirmed,
    detectedLanguageArray: detectedYoudaoLanguageArray,
  };
}
