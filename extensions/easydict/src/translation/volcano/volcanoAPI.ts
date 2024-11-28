/*
 * @author: tisfeng
 * @createTime: 2022-09-26 15:52
 * @lastEditor: tisfeng
 * @lastEditTime: 2023-03-31 16:02
 * @fileName: volcanoAPI.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import axios from "axios";
import { requestCostTime } from "../../axiosConfig";
import { DetectedLangModel, LanguageDetectType } from "../../detectLanguage/types";
import { checkIfPreferredLanguagesContainChinese } from "../../detectLanguage/utils";
import { QueryWordInfo } from "../../dictionary/youdao/types";
import { chineseLanguageItem, englishLanguageItem } from "../../language/consts";
import { getVolcanoLangCode, getYoudaoLangCodeFromVolcanoCode } from "../../language/languages";
import { QueryTypeResult, RequestErrorInfo, TranslationType } from "../../types";
import { getTypeErrorInfo } from "../../utils";
import { VolcanoDetectResult, VolcanoTranslateResult } from "./types";
import { genVolcanoSign } from "./volcanoSign";

console.log(`enter volcanoAPI.ts`);

/**
 * Volcengine Translate API.
 *
 * Docs: https://www.volcengine.com/docs/4640/65067
 */
export function requestVolcanoTranslate(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  console.log(`---> start request Volcano Translate`);

  const { fromLanguage, toLanguage, word } = queryWordInfo;
  const from = getVolcanoLangCode(fromLanguage);
  const to = getVolcanoLangCode(toLanguage);

  const type = TranslationType.Volcano;

  const query = {
    Action: "TranslateText",
    Version: "2020-06-01",
  };
  const params = {
    SourceLanguage: from, // 若不配置此字段，则代表自动检测源语言
    TargetLanguage: to,
    TextList: [word], // 列表长度不超过 8，总文本长度不超过 5000 字符
    Category: "", // 默认使用通用翻译领域，无需填写
  };

  const signObject = genVolcanoSign(query, params);
  if (!signObject) {
    console.warn(`Volcano AccessKey or SecretKey is empty`);
    const errorInfo: RequestErrorInfo = {
      type: type,
      code: "",
      message: "Volcano AccessKey or SecretKey is empty",
    };
    return Promise.reject(errorInfo);
  }

  const url = signObject.getUrl();
  const config = signObject.getConfig();

  return new Promise((resolve, reject) => {
    axios
      .post(url, params, config)
      .then((res) => {
        // log res
        console.warn(`Volcano Translate res: ${JSON.stringify(res.data, null, 4)}`);

        const volcanoResult = res.data as VolcanoTranslateResult;

        console.warn(`ResponseMetaData: ${JSON.stringify(volcanoResult.ResponseMetadata, null, 4)}`);

        const volcanoError = volcanoResult.ResponseMetadata?.Error;

        if (volcanoError) {
          console.error(`Volcano translate error: ${JSON.stringify(volcanoResult)}`);
          const errorInfo: RequestErrorInfo = {
            type: type,
            code: volcanoError.Code || "",
            message: volcanoError.Message || "",
          };
          reject(errorInfo);
          return;
        }

        if (volcanoResult.TranslationList) {
          const translations = volcanoResult.TranslationList[0].Translation.split("\n");
          const result: QueryTypeResult = {
            type: type,
            result: volcanoResult,
            translations: translations,
            queryWordInfo: queryWordInfo,
          };
          resolve(result);

          console.log(`Volcano Translate: ${translations}`);
          console.warn(`Volcano Translate cost time: ${res.headers[requestCostTime]} ms`);
        }
      })
      .catch((error) => {
        if (error.message === "canceled") {
          console.log(`---> Volcano Translate canceled`);
          return reject(undefined);
        }

        console.log(`Volcano Translate err: ${JSON.stringify(error, null, 4)}`);
        const errorInfo = getTypeErrorInfo(type, error);
        reject(errorInfo);
      });
  });
}

/**
 * Volcengine Detect API. Cost time: ~150ms
 */
export function volcanoDetect(text: string): Promise<DetectedLangModel> {
  console.log(`---> start request Volcano Detect`);
  const type = LanguageDetectType.Volcano;

  const query = {
    Action: "LangDetect",
    Version: "2020-06-01",
  };
  const params = {
    TextList: [text],
  };

  const signObject = genVolcanoSign(query, params);

  if (!signObject) {
    console.warn(`Volcano AccessKey or SecretKey is empty`);
    const result: DetectedLangModel = {
      type: type,
      sourceLangCode: "",
      youdaoLangCode: "",
      confirmed: false,
      result: undefined,
    };
    return Promise.resolve(result);
  }

  const url = signObject.getUrl();
  const config = signObject.getConfig();

  return new Promise((resolve, reject) => {
    axios
      .post(url, params, config)
      .then((res) => {
        const volcanoDetectResult = res.data as VolcanoDetectResult;
        const volcanoError = volcanoDetectResult.ResponseMetaData.Error;
        if (volcanoError) {
          console.error(`Volcano detect error: ${JSON.stringify(volcanoDetectResult)}`);
          const errorInfo: RequestErrorInfo = {
            type: type,
            code: volcanoError.Code || "",
            message: volcanoError.Message || "",
          };
          return reject(errorInfo);
        }

        const detectedLanguage = volcanoDetectResult.DetectedLanguageList[0];
        const volcanoLangCode = detectedLanguage.Language;
        const youdaoLangCode = getYoudaoLangCodeFromVolcanoCode(volcanoLangCode);
        const isConfirmed = detectedLanguage.Confidence > 0.5;
        const detectedLanguageModel: DetectedLangModel = {
          type: type,
          sourceLangCode: volcanoLangCode,
          youdaoLangCode: youdaoLangCode,
          confirmed: isConfirmed,
          result: volcanoDetectResult,
        };
        resolve(detectedLanguageModel);

        console.warn(`Volcano detect language: ${JSON.stringify(detectedLanguage)}, youdaoLangCode: ${youdaoLangCode}`);
        console.warn(`Volcano detect cost time: ${res.headers[requestCostTime]} ms`);
      })
      .catch((error) => {
        if (error.message === "canceled") {
          console.log(`---> Volcano detect canceled`);
          return reject(undefined);
        }

        console.log(`Volcano detect err: ${JSON.stringify(error, null, 4)}`);
        const errorInfo = getTypeErrorInfo(type, error);
        reject(errorInfo);
      });
  });
}

/**
 *  Get Volcano web translate url.
 *
 * eg: https://translate.volcengine.com/translate?category=&home_language=zh&source_language=detect&target_language=zh&text=good
 */
export function getVolcanoWebTranslateURL(queryWordInfo: QueryWordInfo): string {
  const { fromLanguage, toLanguage, word } = queryWordInfo;
  const encodeWord = encodeURIComponent(word);
  const from = getVolcanoLangCode(fromLanguage);
  const to = getVolcanoLangCode(toLanguage);
  const homeLanguage = checkIfPreferredLanguagesContainChinese()
    ? chineseLanguageItem.volcanoLangCode
    : englishLanguageItem.volcanoLangCode;

  return `https://translate.volcengine.com/translate?category=&home_language=${homeLanguage}&source_language=${from}&target_language=${to}&text=${encodeWord}`;
}
