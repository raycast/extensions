/*
 * @author: tisfeng
 * @createTime: 2022-06-24 17:07
 * @lastEditor: tisfeng
 * @lastEditTime: 2023-10-12 16:57
 * @fileName: detect.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { autoDetectLanguageItem, chineseLanguageItem, englishLanguageItem } from "../language/consts";
import { isValidLangCode } from "../language/languages";
import { myPreferences } from "../preferences";
import { baiduWebDetect } from "../translation/baidu/baiduAPI";
import { bingDetect } from "../translation/microsoft/bing";
import { hasTencentAppKey, tencentDetect } from "../translation/tencent";
import { volcanoDetect } from "../translation/volcano/volcanoAPI";
import { hasVolcanoAppKey } from "../translation/volcano/volcanoSign";
import { RequestErrorInfo } from "../types";
import { francLanguageDetect } from "./franc";
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

  apiDetectedLanguageList = [];

  // Covert text to lowercase, because Tencent LanguageDetect API is case sensitive, such as 'Section' is detected as 'fr' 😑
  const lowerCaseText = text.toLowerCase();
  console.log("api detect queryText:", text);
  console.log("detect lowerCaseText:", lowerCaseText);

  return new Promise((resolve) => {
    raceDetectTextLanguage(lowerCaseText).then((detectedLanguage) => {
      const finalDetectedLanguage = getFinalDetectedLanguage(text, detectedLanguage, defaultConfirmedConfidence);
      resolve(finalDetectedLanguage);
    });
  });
}

/**
 * Get detect API functions. If API is enabled, add it to detect function list. Add Bing by default.
 */
function getDetectAPIs() {
  const detectActionList = [bingDetect];

  if (myPreferences.enableBaiduLanguageDetect) {
    detectActionList.push(baiduWebDetect);
  }

  // Because Google detect must use proxy now, and set httpsAgent will block thread, so disable it.
  // detectActionList.push(googleDetect);

  if (myPreferences.enableTencentTranslate && hasTencentAppKey()) {
    detectActionList.push(tencentDetect);
  }
  if (myPreferences.enableVolcanoTranslate && hasVolcanoAppKey()) {
    detectActionList.push(volcanoDetect);
  }

  return detectActionList;
}

/**
 * Race to detect language, if success, callback API detect language, else local detect language
 */
function raceDetectTextLanguage(lowerCaseText: string): Promise<DetectedLangModel | undefined> {
  console.log(`start raceDetectLanguage`);
  const detectActionList = getDetectAPIs().map((detect) => detect(lowerCaseText));

  hasDetectFinished = false;
  let detectCount = 0;

  return new Promise((resolve) => {
    detectActionList.forEach((detectAction) => {
      detectAction
        .then((detectedLang) => {
          console.log(`detectAction success: ${detectedLang.type}`);
          handleDetectedLanguage(detectedLang).then((result) => {
            if (result) {
              hasDetectFinished = true;
              resolve(result);
            }
          });
        })
        .catch((error) => {
          // If current API detect error, do nothing, just continue try next API.
          const errorInfo = error as RequestErrorInfo | undefined;
          if (!errorInfo) {
            console.log(`detect canceled`);
          } else {
            console.error(`race detect language error: ${JSON.stringify(error, null, 4)}`); // error: {} ??
          }
        })
        .finally(() => {
          detectCount += 1;
          // If the last detection action is still not resolve, return undefined.
          if (detectCount === detectActionList.length && !hasDetectFinished) {
            console.warn(`last detect action fail, return undefine`);
            resolve(undefined);
          }
        });
    });
  });
}

/**
 * Handle detected language.
 */
function handleDetectedLanguage(detectedLangModel: DetectedLangModel): Promise<DetectedLangModel | undefined> {
  return new Promise((resolve) => {
    if (hasDetectFinished) {
      console.log(`detect has finished, return`);
      return resolve(undefined);
    }

    console.log(`handleDetectedLanguage: ${JSON.stringify(detectedLangModel, null, 4)}`);

    // Record it in the apiDetectedLanguage.
    apiDetectedLanguageList.push(detectedLangModel);
    const detectedLangCode = detectedLangModel.youdaoLangCode;

    /**
     * 1. Preferred to use Google language detect, mark it as confirmed.
     *
     * Generally speaking, Google language detect is the most accurate, but it is too slow, it takes more than 1s.
     * So we have to try to use other types of language detection first.
     */
    if (detectedLangModel.type === LanguageDetectType.Google && detectedLangModel.sourceLangCode.length > 0) {
      console.warn(`use Google detect language: ${detectedLangModel.sourceLangCode}`);
      detectedLangModel.confirmed = true;
      return resolve(detectedLangModel);
    }

    // Detected language must be valid language.
    if (!isValidLangCode(detectedLangCode)) {
      return resolve(undefined);
    }
    // 2. Iterate API detected language List, check if has detected >= `two` identical valid language.
    const detectedIdenticalLanguages: DetectedLangModel[] = [];
    const detectedTypes: string[] = [];
    console.log(`detectedLangCode: ${detectedLangCode}, detectedList: ${apiDetectedLanguageList.length}`);

    for (const lang of apiDetectedLanguageList) {
      if (lang.youdaoLangCode === detectedLangCode) {
        console.log(`detected push: ${lang.type}`);
        detectedIdenticalLanguages.push(lang);
        detectedTypes.push(lang.type.toString().split(" ")[0]);
      }

      // If enabled speed first, and API detected two `preferred` language, try to use it.
      // Perf: To speed up language detection, we use the first detected && preferred language.
      if (detectedIdenticalLanguages.length === 1) {
        // Mark two identical language as prior.
        detectedLangModel.prior = true;

        const onlyOneDetectService = getDetectAPIs().length == 1;

        if (
          onlyOneDetectService ||
          (isPreferredLanguage(detectedLangCode) && myPreferences.enableDetectLanguageSpeedFirst)
        ) {
          detectedLangModel.confirmed = true;
          console.warn(`---> Speed first, API detected language: ${detectedTypes}`);
          console.warn(`detected language: ${JSON.stringify(detectedLangModel, null, 4)}`);
          return resolve(detectedLangModel);
        }
      }

      if (detectedIdenticalLanguages.length >= 2) {
        detectedLangModel.confirmed = true;
        console.warn(`---> API detected >=2 identical language`);
        console.warn(`detected language: ${JSON.stringify(detectedLangModel, null, 4)}`);
        return resolve(detectedLangModel);
      }
    }

    console.log(`type: '${detectedLangModel.type}' detected '${detectedLangCode}' is not confirmed, continue next`);
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
function getFinalDetectedLanguage(
  text: string,
  detectedLangModel: DetectedLangModel | undefined,
  confirmedConfidence: number,
): DetectedLangModel {
  console.log(`start try get final detect: ${JSON.stringify(detectedLangModel, null, 4)}`);
  if (detectedLangModel && detectedLangModel.confirmed) {
    return detectedLangModel;
  }

  const finalDetectedLang = handleFinalDetectedLangFromAPIList(apiDetectedLanguageList);
  if (finalDetectedLang) {
    console.log(`use final detected language from API list: ${JSON.stringify(finalDetectedLang, null, 4)}`);
    return finalDetectedLang;
  }

  return getLocalTextLanguageDetectResult(text, confirmedConfidence);
}

/**
 * Handle final detected language from API list, return the most accurate language.
 */
function handleFinalDetectedLangFromAPIList(
  apiDetectedLanguageList: DetectedLangModel[],
): DetectedLangModel | undefined {
  console.warn(`handleFinalDetectedLangFromAPIList`);

  // If only one detected language, return it.
  if (apiDetectedLanguageList.length === 1) {
    console.warn(`only one detected language, return it`);
    return apiDetectedLanguageList[0];
  }

  // If prior is true, return it.
  const priorDetectedLang = apiDetectedLanguageList.find((lang) => lang.prior);
  if (priorDetectedLang) {
    console.warn(`prior detected language, return it`);
    return priorDetectedLang;
  }

  // If Baidu detected language is valid, return it.
  const baiduDetectedLang = apiDetectedLanguageList.find((lang) => lang.type === LanguageDetectType.Baidu);
  if (baiduDetectedLang && isValidLangCode(baiduDetectedLang.youdaoLangCode)) {
    console.warn(`Baidu detected language is valid, return it`);
    return baiduDetectedLang;
  }

  // If Bing detected language, return it.
  for (const lang of apiDetectedLanguageList) {
    if (lang.type === LanguageDetectType.Bing) {
      console.warn(`Bing detected language, return it`);
      return lang;
    }
  }

  console.log(`no detected language, return undefined`);
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
 *
 * * Todo: need to optimize.
 */
function getLocalTextLanguageDetectResult(
  text: string,
  confirmedConfidence: number,
  lowConfidence = 0.2,
): DetectedLangModel {
  console.warn(`start local detect language, confirmed confidence (>${confirmedConfidence})`);

  // if detect preferred language confidence > confirmedConfidence.
  const francDetectResult = francLanguageDetect(text, confirmedConfidence);
  if (francDetectResult.confirmed) {
    return francDetectResult;
  }

  // if detect preferred language confidence > lowConfidence, use it, mark it as unconfirmed.
  const detectedLanguageArray = francDetectResult.detectedLanguageArray;
  if (detectedLanguageArray) {
    for (const [languageId, confidence] of detectedLanguageArray) {
      if (confidence > lowConfidence && isPreferredLanguage(languageId)) {
        console.log(
          `franc detect preferred but unconfirmed language: ${languageId}, confidence: ${confidence} (>${lowConfidence})`,
        );
        const lowConfidenceDetect: DetectedLangModel = {
          type: francDetectResult.type,
          sourceLangCode: francDetectResult.sourceLangCode,
          youdaoLangCode: languageId,
          confirmed: false,
          detectedLanguageArray: francDetectResult.detectedLanguageArray,
        };
        return lowConfidenceDetect;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function apiDetectedListContainsType(detectedLanguagetype: LanguageDetectType): boolean {
  // console.log(`check if api detected list contains type: ${detectedLanguagetype}`);
  const isContained = apiDetectedLanguageList.find((item) => item.type === detectedLanguagetype);
  return isContained !== undefined;
}
