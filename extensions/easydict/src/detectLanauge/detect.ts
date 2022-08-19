/*
 * @author: tisfeng
 * @createTime: 2022-06-24 17:07
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-18 09:54
 * @fileName: detect.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import axios from "axios";
import { isValidLanguageId } from "../language/languages";
import { myPreferences } from "../preferences";
import { appleLanguageDetect } from "../scripts";
import { baiduLanguageDetect } from "../translation/baidu";
import { googleLanguageDetect } from "../translation/google";
import { tencentLanguageDetect } from "../translation/tencent";
import { RequestErrorInfo } from "../types";
import { francLangaugeDetect } from "./franc";
import { LanguageDetectType, LanguageDetectTypeResult } from "./types";
import {
  checkIfPreferredLanguagesContainedChinese,
  checkIfPreferredLanguagesContainedEnglish,
  isChinese,
  isEnglishOrNumber,
  isPreferredLanguage,
} from "./utils";

/**
 * * For a better user experience, a maximum of 2 seconds is set to request language detect API, and the local language check is used for timeout.
 *
 * If Apple language detection is enabled, both Apple language test and Tencent language test will be initiated, and which first-out result will be used.
 * If the language of the asynchronous check is the preferred language, use it directly. If not, continue to invoke local language detection.
 */
const delayDetectLanguageTime = 2000;
let isDetectedLanguage = false;
let delayLocalDetectLanguageTimer: NodeJS.Timeout;

/**
 * Record all API detected language, if has detected two identical language id, use it.
 */
let apiDetectedLanguageList: LanguageDetectTypeResult[];

const defaultConfirmedConfidence = 0.8;

/**
 * Detect language with the given text, callback with LanguageDetectTypeResult.
 *
 * Prioritize the API language detection, if over time, try to use local language detection.
 *
 * Todo: use class to rewrite.
 */
export function detectLanguage(
  text: string,
  callback: (detectedLanguageResult: LanguageDetectTypeResult) => void
): void {
  console.log(`start detectLanguage`);
  const localDetectResult = getLocalTextLanguageDetectResult(text, defaultConfirmedConfidence);
  apiDetectedLanguageList = [];

  // Start a delay timer to detect local language, use it only if API detect over time.
  clearTimeout(delayLocalDetectLanguageTimer);
  delayLocalDetectLanguageTimer = setTimeout(() => {
    console.log(`API detect over time, try to use local detect language if preferred.`);

    if (localDetectResult.confirmed) {
      console.log("use local detect confirmed:", localDetectResult.type, localDetectResult.youdaoLanguageId);

      isDetectedLanguage = true;
      callback(localDetectResult);
    }
  }, delayDetectLanguageTime);

  // Covert text to lowercase, because Tencent LanguageDetect API is case sensitive, such as 'Section' is detected as 'fr' 😑
  const lowerCaseText = text.toLowerCase();
  console.log("api detect queryText:", text);
  console.log("detect lowerCaseText:", lowerCaseText);

  // new a action map, key is LanguageDetectType, value is Promise<LanguageDetectTypeResult>
  const detectActionMap = new Map<LanguageDetectType, Promise<LanguageDetectTypeResult>>();
  detectActionMap.set(LanguageDetectType.Tencent, tencentLanguageDetect(lowerCaseText));
  if (myPreferences.enableAppleLanguageDetect) {
    detectActionMap.set(LanguageDetectType.Apple, appleLanguageDetect(lowerCaseText));
  }
  detectActionMap.set(LanguageDetectType.Baidu, baiduLanguageDetect(lowerCaseText));
  detectActionMap.set(LanguageDetectType.Google, googleLanguageDetect(lowerCaseText, axios.defaults.signal));

  // if local detect language is not confirmed, use API language detect
  try {
    raceDetectTextLanguage(detectActionMap, localDetectResult, (detectTypeResult) => {
      const finalLanguageTypeResult = getFinalLanguageDetectResult(text, detectTypeResult, defaultConfirmedConfidence);
      callback(finalLanguageTypeResult);
    });
  } catch (error) {
    // ? Never to enter here
    // if API detect error, use local detect language
    console.error(`detect language error: ${error}, callback localDetectResult`);
    callback(localDetectResult);
  }
}

/**
 * Promise race to detect language, if success, callback API detect language, else local detect language
 *
 * Todo: may be don't need to use promise race, callback is ok.
 */
function raceDetectTextLanguage(
  detectLanguageActionMap: Map<LanguageDetectType, Promise<LanguageDetectTypeResult>>,
  localLanguageDetectTypeResult: LanguageDetectTypeResult,
  callback: (detectTypeResult: LanguageDetectTypeResult) => void
) {
  console.log(`start raceDetectTextLanguage: ${[...detectLanguageActionMap.keys()]}`);
  // console.log("race local detect language: ", localLanguageDetectTypeResult);
  isDetectedLanguage = false;
  const detectLanguageActionList = detectLanguageActionMap.values();
  Promise.race(detectLanguageActionList)
    .then((typeResult) => {
      if (isDetectedLanguage) {
        console.warn(`has detected language, promise race detect over time: ${JSON.stringify(typeResult, null, 4)}`);
        return;
      }

      isDetectedLanguage = true;
      clearTimeout(delayLocalDetectLanguageTimer);

      handleDetectedLanguageTypeResult(typeResult, localLanguageDetectTypeResult, detectLanguageActionMap, callback);
    })
    .catch((error) => {
      // If current API detect error, remove it from the detectActionMap, and try next detect API.
      console.error(`race detect language error: ${JSON.stringify(error, null, 4)}`); // error: {} ??

      const errorInfo = error as RequestErrorInfo;
      const errorType = errorInfo.type as LanguageDetectType;
      if (Object.values(LanguageDetectType).includes(errorType)) {
        const detectTypeResult: LanguageDetectTypeResult = {
          type: errorType,
          sourceLanguageId: "",
          youdaoLanguageId: "",
          confirmed: false,
        };
        handleDetectedLanguageTypeResult(
          detectTypeResult,
          localLanguageDetectTypeResult,
          detectLanguageActionMap,
          callback
        );
      }
    });
}

function handleDetectedLanguageTypeResult(
  apiDetectedLanguage: LanguageDetectTypeResult,
  localDetectedLanguage: LanguageDetectTypeResult,
  detectLanguageActionMap: Map<LanguageDetectType, Promise<LanguageDetectTypeResult>>,
  callback: (detectTypeResult: LanguageDetectTypeResult) => void
) {
  console.log(`handleDetectedLanguageTypeResult: ${JSON.stringify(apiDetectedLanguage, null, 4)}`);

  /**
   * 1. Preferred to use Google language detect, mark it as confirmed.
   *
   * Generally speaking, Google language detect is the most accurate, but it is too slow, it takes more than 1s.
   * So we have to try to use other types of language detection first.
   */
  if (apiDetectedLanguage.type === LanguageDetectType.Google) {
    console.log(`use Google detect language`);
    apiDetectedLanguage.confirmed = true;
    callback(apiDetectedLanguage);
    return;
  }

  // 2. Iterate API detected language List, check if has detected two identical language id, if true, use it.
  for (const language of apiDetectedLanguageList) {
    const detectedYoudaoLanguageId = apiDetectedLanguage.youdaoLanguageId;
    if (language.youdaoLanguageId === detectedYoudaoLanguageId && isValidLanguageId(detectedYoudaoLanguageId)) {
      language.confirmed = true;
      console.warn(`---> API: ${apiDetectedLanguage.type} && ${language.type}, detected identical language`);
      console.warn(`detected language: ${JSON.stringify(language, null, 4)}`);
      callback(language); // use the first detected language type, the speed of response is important.
      return;
    }
  }

  // If this API detected language is not confirmed, record it in the apiDetectedLanguage.
  apiDetectedLanguageList.push(apiDetectedLanguage);

  /**
   * 3. If this is the last one, and it's not confirmed, iterate API Detected Language List to compare with the Local Detect Language List.
   * If matched, and the language is preferred, mark it as confirmed. else use it directly, but not confirmed.
   */
  if (detectLanguageActionMap.size === 1) {
    console.log(`try compare API detected language list with local deteced list`);
    console.log(`---> API detected language list: ${JSON.stringify(apiDetectedLanguageList, null, 4)}`);

    const localDetectedLanguageArray = localDetectedLanguage.detectedLanguageArray;
    // console.log(`---> local detected language list: ${JSON.stringify(detectedLocalLanguageArray, null, 4)}`);
    if (localDetectedLanguageArray?.length) {
      for (const [localLanguageId, confidence] of localDetectedLanguageArray) {
        for (const apiLanguage of apiDetectedLanguageList) {
          if (
            apiLanguage.youdaoLanguageId === localLanguageId &&
            isPreferredLanguage(localLanguageId) &&
            confidence > 0
          ) {
            apiLanguage.confirmed = true;
            console.warn(
              `---> API and Local detect identical preferred language: ${JSON.stringify(apiLanguage, null, 4)}`
            );
            callback(apiLanguage);
            return;
          }
        }
      }
    }

    apiDetectedLanguage.confirmed = false;
    console.log(`---> finally, the last API: ${apiDetectedLanguage.type}, not confirmed, but hava to callback use it.`);
    callback(apiDetectedLanguage);
    return;
  }

  // 4. If this API detected language is not confirmed, remove it from the detectActionMap, and try next detect API.
  detectLanguageActionMap.delete(apiDetectedLanguage.type);
  console.log(`---> remove unconfirmed detect action: ${apiDetectedLanguage.type}`);
  console.log(`---> continue to detect next action`);
  raceDetectTextLanguage(detectLanguageActionMap, localDetectedLanguage, callback);
}

/**
 *  Get the final confirmed language type result, for handling some special case.
 *
 *  If detectTypeResult is confirmed, or is preferred language, use it directly, else use low confidence language.
 *
 *  This function is used when high confidence franc detect language is not confirmed, and API detect language catch error.
 */
function getFinalLanguageDetectResult(
  text: string,
  detectedTypeResult: LanguageDetectTypeResult,
  confirmedConfidence: number
): LanguageDetectTypeResult {
  console.log(`start try get final detect language: ${JSON.stringify(detectedTypeResult, null, 4)}`);
  if (detectedTypeResult.confirmed || isPreferredLanguage(detectedTypeResult.youdaoLanguageId)) {
    return detectedTypeResult;
  }
  return getLocalTextLanguageDetectResult(text, confirmedConfidence);
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
 *
 * * Todo: need to optimize.
 */
function getLocalTextLanguageDetectResult(
  text: string,
  confirmedConfidence: number,
  lowConfidence = 0.2
): LanguageDetectTypeResult {
  console.log(`start local detect language, confirmed confidence (>${confirmedConfidence})`);

  // if detect preferred language confidence > confirmedConfidence.
  const francDetectResult = francLangaugeDetect(text, confirmedConfidence);
  if (francDetectResult.confirmed) {
    return francDetectResult;
  }

  // if detect preferred language confidence > lowConfidence, use it, mark it as unconfirmed.
  const detectedLanguageArray = francDetectResult.detectedLanguageArray;
  if (detectedLanguageArray) {
    for (const [languageId, confidence] of detectedLanguageArray) {
      if (confidence > lowConfidence && isPreferredLanguage(languageId)) {
        console.log(
          `franc detect preferred but unconfirmed language: ${languageId}, confidence: ${confidence} (>${lowConfidence})`
        );
        const lowConfidenceDetectTypeResult: LanguageDetectTypeResult = {
          type: francDetectResult.type,
          sourceLanguageId: francDetectResult.sourceLanguageId,
          youdaoLanguageId: languageId,
          confirmed: false,
          detectedLanguageArray: francDetectResult.detectedLanguageArray,
        };
        return lowConfidenceDetectTypeResult;
      }
    }
  }

  // if franc detect language is valid, use it, such as 'fr', 'it'.
  const youdaoLanguageId = francDetectResult.youdaoLanguageId;
  if (isValidLanguageId(youdaoLanguageId)) {
    console.log(`final use franc unconfirmed but valid detect: ${youdaoLanguageId}`);
    return francDetectResult;
  }

  // if simple detect is preferred language, use simple detect language('en', 'zh').
  const simpleDetectLangTypeResult = simpleDetectTextLanguage(text);
  if (isPreferredLanguage(simpleDetectLangTypeResult.youdaoLanguageId)) {
    console.log(`use simple detect: ${JSON.stringify(simpleDetectLangTypeResult, null, 4)}`);
    return simpleDetectLangTypeResult;
  }

  // finally, use "auto" as fallback.
  console.log(`final use auto`);
  const finalAutoLanguageTypeResult: LanguageDetectTypeResult = {
    type: LanguageDetectType.Simple,
    sourceLanguageId: "",
    youdaoLanguageId: "auto",
    confirmed: false,
  };
  return finalAutoLanguageTypeResult;
}

/**
 * Get simple detect language id according to text, priority to use English and Chinese, and then auto.
 *
 * * NOTE: simple detect language, always set confirmed = false.
 */
export function simpleDetectTextLanguage(text: string): LanguageDetectTypeResult {
  let fromYoudaoLanguageId = "auto";
  const englishLanguageId = "en";
  const chineseLanguageId = "zh-CHS";
  if (isEnglishOrNumber(text) && checkIfPreferredLanguagesContainedEnglish()) {
    fromYoudaoLanguageId = englishLanguageId;
  } else if (isChinese(text) && checkIfPreferredLanguagesContainedChinese()) {
    fromYoudaoLanguageId = chineseLanguageId;
  }
  console.log("simple detect language -->:", fromYoudaoLanguageId);
  const detectTypeResult = {
    type: LanguageDetectType.Simple,
    sourceLanguageId: fromYoudaoLanguageId,
    youdaoLanguageId: fromYoudaoLanguageId,
    confirmed: false,
  };
  return detectTypeResult;
}
