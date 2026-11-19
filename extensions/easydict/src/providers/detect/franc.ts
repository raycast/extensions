/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { francAll } from "franc";

import type { DetectionObservation } from "@/core/detect/types";
import { languageItemList } from "@/core/language/consts";
import { getLangCode, getLanguageFromProviderCode, isLanguageCode } from "@/core/language/utils";
import { LanguageDetectType } from "@/core/results/kinds";

import { BaseDetectProvider } from "./base";

export class FrancDetectProvider extends BaseDetectProvider {
  type = LanguageDetectType.Franc;
  isLocal = true;

  isEnabled() {
    return true;
  }

  protected async doDetect(text: string): Promise<DetectionObservation> {
    const only = languageItemList.flatMap((item) => getLangCode(item.youdaoLangCode, "francLangCode") ?? []);
    const candidates = francAll(text, { minLength: 2, only }).map(([code, confidence]) => {
      const language = getLanguageFromProviderCode(code, "francLangCode");
      return { language: isLanguageCode(language) ? language : undefined, confidence };
    });
    return { kind: "ranked", type: this.type, candidates };
  }
}
