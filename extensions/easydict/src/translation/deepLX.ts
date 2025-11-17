/*
 * @author: maxchang3
 * @createTime: 2025-06-26 00:16
 * @lastEditor: maxchang3
 * @lastEditTime: 2025-06-26 10:00
 * @fileName: deeplx.ts
 *
 * Copyright (c) 2025 by maxchang3, All Rights Reserved.
 */

import { translate, type TargetLanguage } from "@deeplx/core";
import { QueryWordInfo } from "../dictionary/youdao/types";
import { getDeepLLangCode } from "../language/languages";
import { QueryTypeResult, RequestErrorInfo, TranslationType } from "../types";

/**
 * DeepLX translate API - Free DeepL translation using deeplx package
 * Cost time: ~0.5-1s
 *
 * Uses the unofficial but free DeepL API client
 * https://github.com/un-ts/deeplx
 */
export async function requestDeepLXTranslate(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  console.log(`---> start request DeepLX`);
  const { fromLanguage, toLanguage, word } = queryWordInfo;
  const sourceLang = getDeepLLangCode(fromLanguage);
  const targetLang = getDeepLLangCode(toLanguage);

  const deepLXType = TranslationType.DeepLX;
  // if language is not supported, return null
  if (!sourceLang || !targetLang) {
    console.log(`DeepLX translate not support language: ${fromLanguage} --> ${toLanguage}`);
    const result: QueryTypeResult = {
      type: deepLXType,
      result: undefined,
      translations: [],
      queryWordInfo: queryWordInfo,
    };
    return Promise.resolve(result);
  }

  const startTime = new Date().getTime();
  try {
    // `sourceLang` is guaranteed not to be 'auto', safe to cast to TargetLanguage
    const translatedText = await translate(word, targetLang as TargetLanguage, sourceLang as TargetLanguage);
    const costTime = new Date().getTime() - startTime;
    console.log(`DeepLX translate: ${JSON.stringify(translatedText, null, 4)}, cost: ${costTime} ms`);

    // Create a result object similar to DeepL API structure
    const deepLXResult = {
      translations: [
        {
          detected_source_language: sourceLang,
          text: translatedText,
        },
      ],
    };

    const deepLXTypeResult: QueryTypeResult = {
      type: TranslationType.DeepLX,
      result: deepLXResult,
      translations: translatedText.split("\n"),
      queryWordInfo: queryWordInfo,
    };
    return deepLXTypeResult;
  } catch (error: unknown) {
    console.error(`---> DeepLX translate error:`, error);

    const errorInfo: RequestErrorInfo = {
      type: deepLXType,
      code: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : "DeepLX translate failed",
    };

    throw errorInfo;
  }
}
