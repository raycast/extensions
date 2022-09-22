/*
 * @author: tisfeng
 * @createTime: 2022-06-24 17:07
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-20 01:31
 * @fileName: detect.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { isValidLanguageId } from "../language/languages";
import { myPreferences } from "../preferences";
import { baiduWebLanguageDetect } from "../translation/baidu";
import { googleLanguageDetect } from "../translation/google";
import { bingLanguageDetect } from "../translation/microsoft/bing";
import { tencentLanguageDetect } from "../translation/tencent";
import { RequestErrorInfo } from "../types";
import { francLangaugeDetect } from "./franc";
import { DetectedLanguageModel, LanguageDetectType } from "./types";
import {
  checkIfPreferredLanguagesContainChinese,
  checkIfPreferredLanguagesContainEnglish,
  isChinese,
  isEnglishOrNumber,
  isPreferredLanguage,
} from "./utils";

/**
 * Record all API detected language, if has detected two identical language id, use it.
 */
let apiDetectedLanguageList: DetectedLanguageModel[];

const defaultConfirmedConfidence = 0.8;

/**
 * Detect language with the given text, callback with LanguageDetectTypeResult.
 *
 * Prioritize the API language detection, if over time, try to use local language detection.
 *
 * Todo: use class to rewrite.
 */
export function detectLanguage(text: string): Promise<DetectedLanguageModel> {
  console.log(`start detectLanguage`);

  const localDetectResult = getLocalTextLanguageDetectResult(text, defaultConfirmedConfidence);
  apiDetectedLanguageList = [];

  return new Promise((resolve) => {
    // Covert text to lowercase, because Tencent LanguageDetect API is case sensitive, such as 'Section' is detected as 'fr' 😑
    const lowerCaseText = text.toLowerCase();
    console.log("api detect queryText:", text);
    console.log("detect lowerCaseText:", lowerCaseText);

    const detectActionList = [
      baiduWebLanguageDetect(lowerCaseText),
      tencentLanguageDetect(lowerCaseText),
      bingLanguageDetect(lowerCaseText),
      googleLanguageDetect(lowerCaseText),
    ];

    if (myPreferences.enableAppleLanguageDetect) {
      // Since Apple detection may block the main thread, so we stop it for now and wait for a solution to be found later.
      // detectActionList.push(appleLanguageDetect(lowerCaseText));
    }

    raceDetectTextLanguage(detectActionList).then((detectedLanguage) => {
      if (!detectedLanguage) {
        console.log(`use localDetectResult`);
        resolve(localDetectResult);
      } else {
        const finalLanguageTypeResult = getFinalDetectedLanguage(text, detectedLanguage, defaultConfirmedConfidence);
        resolve(finalLanguageTypeResult);
      }
    });
  });
}

/**
 * Race to detect language, if success, callback API detect language, else local detect language
 */
function raceDetectTextLanguage(
  detectActionList: Promise<DetectedLanguageModel>[]
): Promise<DetectedLanguageModel | undefined> {
  let isFinished = false;
  let detectCount = 0;
  return new Promise((resolve) => {
    detectActionList.forEach((detectAction) => {
      detectAction
        .then((detectTypeResult) => {
          handleDetectedLanguage(detectTypeResult).then((result) => {
            if (result) {
              resolve(result);
              isFinished = true;
            }
          });
        })
        .catch((error) => {
          // If current API detect error, continue try next API.
          const errorInfo = error as RequestErrorInfo | undefined;
          if (errorInfo) {
            console.error(`race detect language error: ${JSON.stringify(error, null, 4)}`); // error: {} ??
          } else {
            console.log(`detect canceled`);
          }
        })
        .finally(() => {
          detectCount += 1;
          // If the last detection action is still not resolve, return undefined.
          if (detectCount === detectActionList.length && isFinished === false) {
            console.warn(`last detect action fail, return undefine`);
            resolve(undefined);
          }
        });
    });
  });
}

function handleDetectedLanguage(detectedLanguage: DetectedLanguageModel): Promise<DetectedLanguageModel | undefined> {
  console.log(`handleDetectedLanguageTypeResult: ${JSON.stringify(detectedLanguage, null, 4)}`);

  // Record it in the apiDetectedLanguage.
  apiDetectedLanguageList.push(detectedLanguage);
  const detectedLanguageId = detectedLanguage.youdaoLanguageId;

  /**
   * 1. Preferred to use Google language detect, mark it as confirmed.
   *
   * Generally speaking, Google language detect is the most accurate, but it is too slow, it takes more than 1s.
   * So we have to try to use other types of language detection first.
   */
  if (detectedLanguage.type === LanguageDetectType.Google && detectedLanguage.sourceLanguageId.length > 0) {
    console.warn(`use Google detect language: ${detectedLanguage.sourceLanguageId}`);
    detectedLanguage.confirmed = true;
    return Promise.resolve(detectedLanguage);
  }

  // 2. If enabled speed first, and Baidu detect language is confirmed, use it.
  const baiduType = LanguageDetectType.Baidu;
  if (myPreferences.enableLanguageDetectionSpeedFirst) {
    if (detectedLanguage.type === baiduType && detectedLanguage.confirmed && isPreferredLanguage(detectedLanguageId)) {
      console.warn(`---> Speed First, Baidu detected preferred and confirmed language`);
      console.warn(`detected language: ${JSON.stringify(detectedLanguage, null, 4)}`);
      return Promise.resolve(detectedLanguage);
    }
  }

  // 3. Iterate API detected language List, check if has detected > `two` identical valid language.
  const detectedIdenticalLanguages: DetectedLanguageModel[] = [];
  const detectedTypes: LanguageDetectType[] = [];
  for (const lang of apiDetectedLanguageList) {
    // Must be valid language.
    if (lang.youdaoLanguageId === detectedLanguageId && isValidLanguageId(detectedLanguageId)) {
      detectedIdenticalLanguages.push(lang);
      detectedTypes.push(lang.type);
    }
    console.log(`detected Identical Languages: ${detectedTypes}`);

    // If API detected two `preferred` language, try use it.
    if (detectedIdenticalLanguages.length === 2) {
      const bingType = LanguageDetectType.Bing;
      const containBingDetect = detectedLanguage.type === bingType || apiDetectedListContainsType(bingType);
      const confirmedBingDetect = containBingDetect && myPreferences.enableLanguageDetectionSpeedFirst;

      if (confirmedBingDetect && isPreferredLanguage(detectedLanguageId)) {
        detectedLanguage.confirmed = true;
        console.warn(`---> API detected 'two' identical preferred language: ${detectedTypes}`);
        console.warn(`detected language: ${JSON.stringify(detectedLanguage, null, 4)}`);
        return Promise.resolve(detectedLanguage);
      }
    }

    if (detectedIdenticalLanguages.length >= 3) {
      detectedLanguage.confirmed = true;
      console.warn(`---> API detected 'three' or more identical language`);
      console.warn(`detected language: ${JSON.stringify(detectedLanguage, null, 4)}`);
      return Promise.resolve(detectedLanguage);
    }
  }

  console.log(`type: '${detectedLanguage.type}' detected language is not confirmed, ${detectedLanguageId}`);

  return Promise.resolve(undefined);
}

/**
 *  Get the final confirmed language type result, for handling some special case.
 *
 *  If detectTypeResult is confirmed, or is preferred language, use it directly, else use low confidence language.
 *
 *  This function is used when high confidence franc detect language is not confirmed, and API detect language catch error.
 */
function getFinalDetectedLanguage(
  text: string,
  detectedTypeResult: DetectedLanguageModel,
  confirmedConfidence: number
): DetectedLanguageModel {
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
): DetectedLanguageModel {
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
        const lowConfidenceDetectTypeResult: DetectedLanguageModel = {
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
  const finalAutoLanguageTypeResult: DetectedLanguageModel = {
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
export function simpleDetectTextLanguage(text: string): DetectedLanguageModel {
  let fromYoudaoLanguageId = "auto";
  const englishLanguageId = "en";
  const chineseLanguageId = "zh-CHS";
  if (isEnglishOrNumber(text) && checkIfPreferredLanguagesContainEnglish()) {
    fromYoudaoLanguageId = englishLanguageId;
  } else if (isChinese(text) && checkIfPreferredLanguagesContainChinese()) {
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

function apiDetectedListContainsType(detectedLanguagetype: LanguageDetectType): boolean {
  // console.log(`check if api detected list contains type: ${detectedLanguagetype}`);
  // console.log(`api detected list: ${JSON.stringify(apiDetectedLanguageList, null, 4)}`);
  const isContained = apiDetectedLanguageList.find((item) => item.type === detectedLanguagetype);
  // console.log(`is contained: ${isContained}`);
  return isContained !== undefined;
}
