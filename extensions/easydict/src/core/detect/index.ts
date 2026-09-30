/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */
import { getPreferenceValues } from "@raycast/api";

import { config } from "@/core/config";
import { autoDetectLanguageItem, chineseLanguageItem, englishLanguageItem } from "@/core/language/consts";
import { isValidLangCode } from "@/core/language/utils";
import type { BaseDetectProvider, DetectOptions } from "@/providers/detect/base";
import { detectServices } from "@/providers/detect/registry";
import { LanguageDetectType } from "@/types/api";
import { CancelledError } from "@/utils/errors";
import { logError, logSummary, logTrace } from "@/utils/logger";

import type { DetectedLangModel } from "./types";
import {
  checkIfPreferredLanguagesContainChinese,
  checkIfPreferredLanguagesContainEnglish,
  isChinese,
  isEnglishOrNumber,
  isPreferredLanguage,
} from "./utils";

interface DetectContext {
  apiDetectedLanguageList: DetectedLangModel[];
  hasDetectFinished: boolean;
  signal?: AbortSignal;
}

const defaultConfirmedConfidence = 0.8;

let apiDetectors: BaseDetectProvider[] | null = null;
let localDetectors: BaseDetectProvider[] | null = null;

function initDetectors() {
  const preferences = getPreferenceValues<Preferences>();
  const enabled = detectServices
    .filter((c) => {
      if (c.preference && preferences[c.preference] === false) {
        return false;
      }
      return true;
    })
    .map((c) => new c.provider())
    .filter((p) => p.isEnabled());

  apiDetectors = enabled.filter((p) => !p.isLocal);
  localDetectors = enabled.filter((p) => p.isLocal);
}

/**
 * given text, callback with LanguageDetectTypeResult.
 *
 * Prioritize the API language detection, if over time, try to use local language detection.
 */
export async function detectLanguage(text: string, signal?: AbortSignal): Promise<DetectedLangModel> {
  const ctx: DetectContext = { apiDetectedLanguageList: [], hasDetectFinished: false, signal };

  // Covert text to lowercase, because Tencent LanguageDetect API is case sensitive, such as 'Section' is detected as 'fr' 😑
  const lowerCaseText = text.toLowerCase();

  const startTime = performance.now();
  const detectedLanguage = await raceDetectTextLanguage(lowerCaseText, ctx);
  const result = await getFinalDetectedLanguage(text, detectedLanguage, defaultConfirmedConfidence, ctx);
  const duration = (performance.now() - startTime).toFixed(0);

  const source =
    result.type === LanguageDetectType.Simple || result.type === LanguageDetectType.Franc
      ? `local:${result.type}`
      : result.type.toString();
  const confirmed = result.confirmed ? "confirmed" : "unconfirmed";
  logSummary("Detect", `${result.youdaoLangCode} (${source}, ${duration}ms, ${confirmed})`);

  return result;
}

/**
 * Get enabled API detect providers from the registry.
 */
function getDetectAPIs(signal?: AbortSignal): Array<(text: string) => Promise<DetectedLangModel>> {
  initDetectors();
  const opts: DetectOptions = { signal };
  return apiDetectors!.map((provider) => (text: string) => provider.detect(text, opts));
}

/**
 * Race to detect language, if success, callback API detect language, else local detect language
 */
function raceDetectTextLanguage(lowerCaseText: string, ctx: DetectContext): Promise<DetectedLangModel | undefined> {
  if (ctx.signal?.aborted) {
    return Promise.reject(new CancelledError());
  }

  const raceController = new AbortController();
  const signal = ctx.signal ? AbortSignal.any([ctx.signal, raceController.signal]) : raceController.signal;
  const detectActionList = getDetectAPIs(signal).map((detect) => detect(lowerCaseText));

  ctx.hasDetectFinished = false;
  let detectCount = 0;

  return new Promise((resolve, reject) => {
    let settled = false;
    const handleAbort = () => {
      if (settled) return;
      settled = true;
      ctx.hasDetectFinished = true;
      raceController.abort();
      ctx.signal?.removeEventListener("abort", handleAbort);
      reject(new CancelledError());
    };
    const finish = (result: DetectedLangModel | undefined) => {
      if (settled) return;
      settled = true;
      ctx.signal?.removeEventListener("abort", handleAbort);
      resolve(result);
    };

    if (ctx.signal?.aborted) {
      handleAbort();
      return;
    }
    ctx.signal?.addEventListener("abort", handleAbort, { once: true });

    if (detectActionList.length === 0) {
      finish(undefined);
      return;
    }

    detectActionList.forEach((detectAction) => {
      detectAction
        .then((detectedLang) => handleDetectedLanguage(detectedLang, ctx))
        .then((result) => {
          if (result) {
            ctx.hasDetectFinished = true;
            raceController.abort();
            finish(result);
          }
        })
        .catch((error) => {
          if (error instanceof CancelledError) {
            if (!ctx.signal?.aborted) {
              logTrace("Detect", "detect cancelled");
            }
          } else {
            logError("Detect", `race detect error`, error);
          }
        })
        .finally(() => {
          detectCount += 1;
          // If the last detection action is still not resolve, return undefined.
          if (detectCount === detectActionList.length && !ctx.hasDetectFinished) {
            if (!ctx.signal?.aborted) {
              logTrace("Detect", "no confirmed API detection");
            }
            finish(undefined);
          }
        });
    });
  });
}

/**
 * Handle detected language.
 */
function handleDetectedLanguage(
  detectedLangModel: DetectedLangModel,
  ctx: DetectContext,
): Promise<DetectedLangModel | undefined> {
  return new Promise((resolve) => {
    if (ctx.hasDetectFinished) {
      return resolve(undefined);
    }

    // Record it in the apiDetectedLanguage.
    ctx.apiDetectedLanguageList.push(detectedLangModel);
    const detectedLangCode = detectedLangModel.youdaoLangCode;

    // Detected language must be valid language.
    if (!isValidLangCode(detectedLangCode)) {
      return resolve(undefined);
    }

    // Iterate API detected language list, checking for at least two identical valid results.
    const detectedIdenticalLanguages: DetectedLangModel[] = [];
    const detectedTypes: string[] = [];

    for (const lang of ctx.apiDetectedLanguageList) {
      if (lang.youdaoLangCode === detectedLangCode) {
        detectedIdenticalLanguages.push(lang);
        detectedTypes.push(lang.type.toString().split(" ")[0]);
      }

      // If enabled speed first, and API detected two `preferred` language, try to use it.
      // Perf: To speed up language detection, we use the first detected && preferred language.
      if (detectedIdenticalLanguages.length === 1) {
        // Mark two identical language as prior.
        detectedLangModel.prior = true;

        const onlyOneDetectService = apiDetectors!.length === 1;

        if (onlyOneDetectService || (isPreferredLanguage(detectedLangCode) && config.enableDetectLanguageSpeedFirst)) {
          detectedLangModel.confirmed = true;
          return resolve(detectedLangModel);
        }
      }

      if (detectedIdenticalLanguages.length >= 2) {
        detectedLangModel.confirmed = true;
        return resolve(detectedLangModel);
      }
    }

    return resolve(undefined);
  });
}

/**
 * Get the final confirmed language, for handling some special case.
 *
 * 1. If detect language is confirmed, use it directly.
 * 2. Try to use the most accurate language in apiDetectedLanguageList.
 * 3. If all language detect failed, use local detect language.
 */
async function getFinalDetectedLanguage(
  text: string,
  detectedLangModel: DetectedLangModel | undefined,
  confirmedConfidence: number,
  ctx: DetectContext,
): Promise<DetectedLangModel> {
  if (detectedLangModel && detectedLangModel.confirmed) {
    return detectedLangModel;
  }

  const finalDetectedLang = handleFinalDetectedLangFromAPIList(ctx.apiDetectedLanguageList);
  if (finalDetectedLang) {
    return finalDetectedLang;
  }

  return await getLocalTextLanguageDetectResult(text, confirmedConfidence, ctx.signal);
}

/**
 * Handle final detected language from API list, return the most accurate language.
 */
function handleFinalDetectedLangFromAPIList(
  apiDetectedLanguageList: DetectedLangModel[],
): DetectedLangModel | undefined {
  // If only one detected language, return it.
  if (apiDetectedLanguageList.length === 1) {
    return apiDetectedLanguageList[0];
  }

  // If prior is true, return it.
  const priorDetectedLang = apiDetectedLanguageList.find((lang) => lang.prior);
  if (priorDetectedLang) {
    return priorDetectedLang;
  }

  // If Baidu detected language is valid, return it.
  const baiduDetectedLang = apiDetectedLanguageList.find((lang) => lang.type === LanguageDetectType.Baidu);
  if (baiduDetectedLang && isValidLangCode(baiduDetectedLang.youdaoLangCode)) {
    return baiduDetectedLang;
  }

  // If Bing detected language, return it.
  for (const lang of apiDetectedLanguageList) {
    if (lang.type === LanguageDetectType.Bing) {
      return lang;
    }
  }

  return undefined;
}

/**
 *  Get local detect language result.
 *
 *  @confirmedConfidence if local detect preferred language confidence > confirmedConfidence, give priority to use it.
 *  * NOTE: Only preferred language confidence > confirmedConfidence will mark as confirmed.
 *
 *  First, if franc detect language is confirmed, use it directly.
 *  Second, if detect preferred language confidence > lowConfidence, use it, but not confirmed.
 *  Third, if franc detect language is valid, use it, but not confirmed.
 *  Finally, if simple detect language is preferred language, use it. else use "auto".
 */
async function getLocalTextLanguageDetectResult(
  text: string,
  confirmedConfidence: number,
  signal?: AbortSignal,
  lowConfidence = 0.2,
): Promise<DetectedLangModel> {
  initDetectors();

  if (localDetectors && localDetectors.length > 0) {
    const localProvider = localDetectors[0];
    try {
      const localDetectResult = await localProvider.detect(text, { confirmedConfidence, signal });
      if (localDetectResult.confirmed) {
        return localDetectResult;
      }

      // if detect preferred language confidence > lowConfidence, use it, mark it as unconfirmed.
      const detectedLanguageArray = localDetectResult.detectedLanguageArray;
      if (detectedLanguageArray) {
        for (const [languageId, confidence] of detectedLanguageArray) {
          if (confidence > lowConfidence && isPreferredLanguage(languageId)) {
            const lowConfidenceDetect: DetectedLangModel = {
              type: localDetectResult.type,
              sourceLangCode: localDetectResult.sourceLangCode,
              youdaoLangCode: languageId,
              confirmed: false,
              detectedLanguageArray: localDetectResult.detectedLanguageArray,
            };
            return lowConfidenceDetect;
          }
        }
      }

      // if local detect language is valid, use it, such as 'fr', 'it'.
      const youdaoLangCode = localDetectResult.youdaoLangCode;
      if (isValidLangCode(youdaoLangCode)) {
        return localDetectResult;
      }
    } catch (error) {
      if (error instanceof CancelledError) {
        logTrace("Detect", "local detect cancelled");
      } else {
        logError("Detect", "local detect error", error);
      }
    }
  }

  // if simple detect is preferred language, use simple detect language('en', 'zh').
  const simpleDetectLangTypeResult = simpleDetectTextLanguage(text);
  if (isPreferredLanguage(simpleDetectLangTypeResult.youdaoLangCode)) {
    return simpleDetectLangTypeResult;
  }

  // finally, use "auto" as fallback.
  return {
    type: LanguageDetectType.Simple,
    sourceLangCode: "",
    youdaoLangCode: "auto",
    confirmed: false,
  };
}

/**
 * Get simple detect language id according to text, priority to use English and Chinese, and then auto.
 *
 * * NOTE: simple detect language, always set confirmed = false.
 */
function simpleDetectTextLanguage(text: string): DetectedLangModel {
  let fromYoudaoLangCode = autoDetectLanguageItem.youdaoLangCode;
  if (isEnglishOrNumber(text) && checkIfPreferredLanguagesContainEnglish()) {
    fromYoudaoLangCode = englishLanguageItem.youdaoLangCode;
  } else if (isChinese(text) && checkIfPreferredLanguagesContainChinese()) {
    fromYoudaoLangCode = chineseLanguageItem.youdaoLangCode;
  }
  return {
    type: LanguageDetectType.Simple,
    sourceLangCode: fromYoudaoLangCode,
    youdaoLangCode: fromYoudaoLangCode,
    confirmed: false,
  };
}
