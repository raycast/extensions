/*
 * @author: tisfeng
 * @createTime: 2022-06-24 17:07
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-27 23:22
 * @fileName: detect.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { isValidLangCode } from "../language/languages";
import { myPreferences } from "../preferences";
import { appleLanguageDetect } from "../scripts";
import { baiduWebDetect } from "../translation/baidu/baiduAPI";
import { googleDetect } from "../translation/google";
import { bingDetect } from "../translation/microsoft/bing";
import { hasTencentAppKey, tencentDetect } from "../translation/tencent";
import { volcanoDetect } from "../translation/volcano/volcanoAPI";
import { hasVolcanoAppKey } from "../translation/volcano/volcanoSign";
import { RequestErrorInfo } from "../types";
import { autoDetectLanguageItem, chineseLanguageItem, englishLanguageItem } from "./../language/consts";
import { francLangaugeDetect } from "./franc";
import { DetectedLangModel, LanguageDetectType } from "./types";
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
let apiDetectedLanguageList: DetectedLangModel[];

const defaultConfirmedConfidence = 0.8;

let hasDetectFinished = false;

/**
 given text, callback with LanguageDetectTypeResult.
 *
 * Prioritize the API language detection, if over time, try to use local language detection.
 *
 * Todo: use class to rewrite.
 */
export function detectLanguage(text: string): Promise<DetectedLangModel> {
  console.log(`start detectLanguage`);

  const localDetectResult = getLocalTextLanguageDetectResult(text, defaultConfirmedConfidence);
  apiDetectedLanguageList = [];

  return new Promise((resolve) => {
    // Covert text to lowercase, because Tencent LanguageDetect API is case sensitive, such as 'Section' is detected as 'fr' 😑
    const lowerCaseText = text.toLowerCase();
    console.log("api detect queryText:", text);
    console.log("detect lowerCaseText:", lowerCaseText);

    const detectActionList = getDetectAPIs().map((detect) => detect(lowerCaseText));
    raceDetectLanguage(detectActionList).then((detectedLanguage) => {
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
 * Get detect API functions. If API is enabled, add it to detect function list. Add Google and Bing by default.
 */
function getDetectAPIs() {
  const detectActionList = [];
  detectActionList.push(bingDetect);
  detectActionList.push(googleDetect);

  if (myPreferences.enableBaiduTranslate) {
    detectActionList.push(baiduWebDetect);
  }

  if (myPreferences.enableTencentTranslate && hasTencentAppKey()) {
    detectActionList.push(tencentDetect);
  }
  if (myPreferences.enableVolcanoTranslate && hasVolcanoAppKey()) {
    detectActionList.push(volcanoDetect);
  }

  // Apple detection is inaccurate, only use it when lacking detect API.
  if (detectActionList.length < 3 && myPreferences.enableAppleLanguageDetect) {
    // Since Apple detect may block the main thread, so we stop it for now and wait for a solution to be found later.
    detectActionList.push(appleLanguageDetect);
  }

  return detectActionList;
}

/**
 * Race to detect language, if success, callback API detect language, else local detect language
 */
function raceDetectLanguage(detectActionList: Promise<DetectedLangModel>[]): Promise<DetectedLangModel | undefined> {
  hasDetectFinished = false;
  let detectCount = 0;
  return new Promise((resolve) => {
    detectActionList.forEach((detectAction) => {
      detectAction
        .then((detectTypeResult) => {
          handleDetectedLanguage(detectTypeResult).then((result) => {
            if (result) {
              resolve(result);
              hasDetectFinished = true;
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
          if (detectCount === detectActionList.length && hasDetectFinished === false) {
            console.warn(`last detect action fail, return undefine`);
            resolve(undefined);
          }
        });
    });
  });
}

function handleDetectedLanguage(detectedLang: DetectedLangModel): Promise<DetectedLangModel | undefined> {
  return new Promise((resolve) => {
    if (hasDetectFinished) {
      console.log(`detect has finished, return undefined`);
      return resolve(undefined);
    }

    console.log(`handleDetectedLanguageTypeResult: ${JSON.stringify(detectedLang, null, 4)}`);

    // Record it in the apiDetectedLanguage.
    apiDetectedLanguageList.push(detectedLang);
    const detectedLangCode = detectedLang.youdaoLangCode;

    /**
     * 1. Preferred to use Google language detect, mark it as confirmed.
     *
     * Generally speaking, Google language detect is the most accurate, but it is too slow, it takes more than 1s.
     * So we have to try to use other types of language detection first.
     */
    if (detectedLang.type === LanguageDetectType.Google && detectedLang.sourceLangCode.length > 0) {
      console.warn(`use Google detect language: ${detectedLang.sourceLangCode}`);
      detectedLang.confirmed = true;
      return resolve(detectedLang);
    }

    // Detected language must be valid language.
    if (!isValidLangCode(detectedLangCode)) {
      return resolve(undefined);
    }

    // 2. Iterate API detected language List, check if has detected >= `two` identical valid language.
    const detectedIdenticalLanguages: DetectedLangModel[] = [];
    const detectedTypes: string[] = [];
    for (const lang of apiDetectedLanguageList) {
      if (lang.youdaoLangCode === detectedLangCode) {
        detectedIdenticalLanguages.push(lang);
        detectedTypes.push(lang.type.toString().split(" ")[0]);
      }

      // If enabled speed first, and API detected two `preferred` language, try to use it.
      if (detectedIdenticalLanguages.length === 2) {
        const baiduType = LanguageDetectType.Baidu;
        const bingType = LanguageDetectType.Bing;
        const volcanoType = LanguageDetectType.Volcano;
        const containBingDetect = detectedLang.type === bingType || apiDetectedListContainsType(bingType);
        const containBaiduDetect = detectedLang.type === baiduType || apiDetectedListContainsType(baiduType);
        const containVolcanoDetect = detectedLang.type === volcanoType || apiDetectedListContainsType(volcanoType);
        const confirmVolcanoDetect = containVolcanoDetect && detectedLang.confirmed;
        if (
          (containBingDetect || containBaiduDetect || confirmVolcanoDetect) &&
          isPreferredLanguage(detectedLangCode) &&
          myPreferences.enableLanguageDetectionSpeedFirst
        ) {
          detectedLang.confirmed = true;
          console.warn(`---> Speed first, API detected 'two' identical 'preferred' language: ${detectedTypes}`);
          console.warn(`detected language: ${JSON.stringify(detectedLang, null, 4)}`);
          return resolve(detectedLang);
        }
      }

      if (detectedIdenticalLanguages.length >= 3) {
        detectedLang.confirmed = true;
        console.warn(`---> API detected 'three' identical language`);
        console.warn(`detected language: ${JSON.stringify(detectedLang, null, 4)}`);
        return resolve(detectedLang);
      }
    }

    console.log(`type: '${detectedLang.type}' detected '${detectedLangCode}' is not confirmed, continue next detect`);
    return resolve(undefined);
  });
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
  detectedTypeResult: DetectedLangModel,
  confirmedConfidence: number
): DetectedLangModel {
  console.log(`start try get final detect language: ${JSON.stringify(detectedTypeResult, null, 4)}`);
  if (detectedTypeResult.confirmed || isPreferredLanguage(detectedTypeResult.youdaoLangCode)) {
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
): DetectedLangModel {
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
        const lowConfidenceDetectTypeResult: DetectedLangModel = {
          type: francDetectResult.type,
          sourceLangCode: francDetectResult.sourceLangCode,
          youdaoLangCode: languageId,
          confirmed: false,
          detectedLanguageArray: francDetectResult.detectedLanguageArray,
        };
        return lowConfidenceDetectTypeResult;
      }
    }
  }

  // if franc detect language is valid, use it, such as 'fr', 'it'.
  const youdaoLangCode = francDetectResult.youdaoLangCode;
  if (isValidLangCode(youdaoLangCode)) {
    console.log(`final use franc unconfirmed but valid detect: ${youdaoLangCode}`);
    return francDetectResult;
  }

  // if simple detect is preferred language, use simple detect language('en', 'zh').
  const simpleDetectLangTypeResult = simpleDetectTextLanguage(text);
  if (isPreferredLanguage(simpleDetectLangTypeResult.youdaoLangCode)) {
    console.log(`use simple detect: ${JSON.stringify(simpleDetectLangTypeResult, null, 4)}`);
    return simpleDetectLangTypeResult;
  }

  // finally, use "auto" as fallback.
  console.log(`final use auto`);
  const finalAutoLanguageTypeResult: DetectedLangModel = {
    type: LanguageDetectType.Simple,
    sourceLangCode: "",
    youdaoLangCode: "auto",
    confirmed: false,
  };
  return finalAutoLanguageTypeResult;
}

/**
 * Get simple detect language id according to text, priority to use English and Chinese, and then auto.
 *
 * * NOTE: simple detect language, always set confirmed = false.
 */
export function simpleDetectTextLanguage(text: string): DetectedLangModel {
  let fromYoudaoLangCode = autoDetectLanguageItem.youdaoLangCode;
  if (isEnglishOrNumber(text) && checkIfPreferredLanguagesContainEnglish()) {
    fromYoudaoLangCode = englishLanguageItem.youdaoLangCode;
  } else if (isChinese(text) && checkIfPreferredLanguagesContainChinese()) {
    fromYoudaoLangCode = chineseLanguageItem.youdaoLangCode;
  }
  console.log("simple detect language -->:", fromYoudaoLangCode);
  const detectTypeResult: DetectedLangModel = {
    type: LanguageDetectType.Simple,
    sourceLangCode: fromYoudaoLangCode,
    youdaoLangCode: fromYoudaoLangCode,
    confirmed: false,
  };
  return detectTypeResult;
}

function apiDetectedListContainsType(detectedLanguagetype: LanguageDetectType): boolean {
  // console.log(`check if api detected list contains type: ${detectedLanguagetype}`);
  const isContained = apiDetectedLanguageList.find((item) => item.type === detectedLanguagetype);
  return isContained !== undefined;
}
