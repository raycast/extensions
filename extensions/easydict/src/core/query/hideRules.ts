/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { myPreferences } from "@/consts";
import { TranslationType } from "@/types/api";
import type { QueryType } from "@/types/query";

/** Apply hide rules to a query result, returning the updated hideDisplay flag. */
export function computeHideDisplay(type: QueryType): boolean {
  if (type === TranslationType.DeepL) {
    return !myPreferences.enableDeepLTranslate;
  }

  if (type === TranslationType.Youdao) {
    return myPreferences.enableYoudaoDictionary && !myPreferences.enableYoudaoTranslate;
  }

  return false;
}
