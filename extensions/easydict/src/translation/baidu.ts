/*
 * @author: tisfeng
 * @createTime: 2022-08-03 10:18
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-22 18:22
 * @fileName: baidu.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import axios, { AxiosError } from "axios";
import querystring from "node:querystring";
import { requestCostTime } from "../axiosConfig";
import { DetectedLanguageModel, LanguageDetectType } from "../detectLanauge/types";
import { QueryWordInfo } from "../dictionary/youdao/types";
import { getBaiduLanguageId, getYoudaoLanguageIdFromBaiduId, isValidLanguageId } from "../language/languages";
import { KeyStore } from "../preferences";
import { BaiduTranslateResult, QueryTypeResult, RequestErrorInfo, TranslationType } from "../types";
import { getTypeErrorInfo, md5 } from "../utils";
import { autoDetectLanguageItem, englishLanguageItem } from "./../language/consts";
import { BaiduWebLanguageDetect } from "./../types";

/**
 * Baidu translate. Cost time: ~0.4s
 *
 * 百度翻译API https://fanyi-api.baidu.com/doc/21
 */
export function requestBaiduTextTranslate(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  console.log(`---> start request Baidu translate`);
  const { fromLanguage, toLanguage, word } = queryWordInfo;
  const salt = Math.round(new Date().getTime() / 1000);
  const baiduAppId = KeyStore.baiduAppId;
  const md5Content = baiduAppId + word + salt + KeyStore.baiduAppSecret;
  const sign = md5(md5Content);
  const url = "https://fanyi-api.baidu.com/api/trans/vip/translate";
  const from = getBaiduLanguageId(fromLanguage);
  const to = getBaiduLanguageId(toLanguage);
  const encodeQueryText = Buffer.from(word, "utf8").toString();
  const params = {
    q: encodeQueryText,
    from: from,
    to: to,
    appid: baiduAppId,
    salt: salt,
    sign: sign,
  };
  // console.log(`---> Baidu params: ${JSON.stringify(params, null, 4)}`);

  const type = TranslationType.Baidu;

  return new Promise((resolve, reject) => {
    axios
      .get(url, { params })
      .then((response) => {
        const baiduResult = response.data as BaiduTranslateResult;
        // console.log(`---> baiduResult: ${JSON.stringify(baiduResult, null, 4)}`);
        if (baiduResult.trans_result) {
          const translations = baiduResult.trans_result.map((item) => item.dst);
          console.warn(
            `Baidu translate: ${translations}, ${baiduResult.from}, cost: ${response.headers[requestCostTime]} ms`
          );
          const result: QueryTypeResult = {
            type: type,
            result: baiduResult,
            translations: translations,
            wordInfo: queryWordInfo,
          };
          resolve(result);
        } else {
          console.error(`baidu translate error: ${JSON.stringify(baiduResult)}`); //  {"error_code":"54001","error_msg":"Invalid Sign"}
          const errorInfo: RequestErrorInfo = {
            type: type,
            code: baiduResult.error_code || "",
            message: baiduResult.error_msg || "",
          };
          reject(errorInfo);
        }
      })
      .catch((error: AxiosError) => {
        if (error.message === "canceled") {
          console.log(`---> baidu canceled`);
          return reject(undefined);
        }

        // It seems that Baidu will never reject, always resolve...
        console.error(`---> baidu translate error: ${error}`);
        const errorInfo = getTypeErrorInfo(type, error);
        reject(errorInfo);
      });
  });
}

/**
 * Baidu language detect. Cost time: ~0.4s
 *
 * Although Baidu provides a dedicated language recognition interface, the number of supported languages is too small, so we directly use Baidu Translate's automatic language recognition instead.
 *
 * 百度语种识别API https://fanyi-api.baidu.com/doc/24
 *
 * Incorrect examples: const -> glg ??
 */
export async function baiduLanguageDetect(text: string): Promise<DetectedLanguageModel> {
  console.log(`---> start request Baidu language detect`);

  const queryWordInfo: QueryWordInfo = {
    fromLanguage: autoDetectLanguageItem.baiduLangCode,
    toLanguage: englishLanguageItem.baiduLangCode,
    word: text,
  };

  const type = LanguageDetectType.Baidu;

  return new Promise((resolve, reject) => {
    requestBaiduTextTranslate(queryWordInfo)
      .then((baiduTypeResult) => {
        const baiduResult = baiduTypeResult.result as BaiduTranslateResult;
        const baiduLanaugeId = baiduResult.from || "";
        const youdaoLanguageId = getYoudaoLanguageIdFromBaiduId(baiduLanaugeId);
        console.warn(`---> Baidu language detect: ${baiduLanaugeId}, youdaoId: ${youdaoLanguageId}`);

        /**
       * Generally speaking, Baidu language auto-detection is more accurate than Tencent language recognition.
       * Baidu language recognition is inaccurate in very few cases, such as "ragazza", it should be Italian, but Baidu auto detect is en.
       * In this case, trans_result's src === dst.
       *
       * * The Baidu results seem to have changed recently...
       * {
              "src": "ragazza",
              "dst": "拉加扎"
          }
       */
        let confirmed = false;
        const transResult = baiduResult.trans_result;
        if (transResult?.length) {
          const firstTransResult = transResult[0];
          confirmed = firstTransResult.dst !== firstTransResult.src;
        }
        const detectedLanguageResult: DetectedLanguageModel = {
          type: type,
          sourceLanguageId: baiduLanaugeId,
          youdaoLanguageId: youdaoLanguageId,
          confirmed: confirmed,
          result: baiduResult,
        };
        resolve(detectedLanguageResult);
      })
      .catch((error) => {
        const errorInfo = error as RequestErrorInfo | undefined;
        if (errorInfo) {
          console.error(`---> Baidu language detect error: ${JSON.stringify(error)}`);
          errorInfo.type = type; // * Note: need to set language detect type.
        }
        reject(errorInfo);
      });
  });
}

/**
 * Baidu web language detect, unofficial API. Cost time: ~0.3s
 */
export async function baiduWebLanguageDetect(text: string): Promise<DetectedLanguageModel> {
  console.log(`---> start web Baidu language detect`);
  const type = LanguageDetectType.Baidu;

  return new Promise((resolve, reject) => {
    const url = "https://fanyi.baidu.com/langdetect";
    const params = { query: text };
    axios
      .post(url, querystring.stringify(params))
      .then((response) => {
        // console.log(`---> web Baidu language detect response: ${JSON.stringify(response.data)}`);

        const baiduWebLanguageDetect = response.data as BaiduWebLanguageDetect;
        if (baiduWebLanguageDetect.error === 0) {
          const baiduLanaugeId = baiduWebLanguageDetect.lan || "";
          const youdaoLanguageId = getYoudaoLanguageIdFromBaiduId(baiduLanaugeId);
          const isConfirmed = isValidLanguageId(youdaoLanguageId);

          console.warn(`---> Baidu detect langu cost: ${response.headers[requestCostTime]} ms`);
          console.warn(`---> Baidu language detect: ${baiduLanaugeId}, youdaoId: ${youdaoLanguageId}`);

          const detectedLanguageResult: DetectedLanguageModel = {
            type: type,
            sourceLanguageId: baiduLanaugeId,
            youdaoLanguageId: youdaoLanguageId,
            confirmed: isConfirmed,
            result: baiduWebLanguageDetect,
          };
          resolve(detectedLanguageResult);
        } else {
          console.error(`web Baidu detect error: ${JSON.stringify(baiduWebLanguageDetect)}`);

          const errorInfo = getBaiduWebLanguageDetectErrorInfo(baiduWebLanguageDetect);
          reject(errorInfo);
        }
      })
      .catch((error) => {
        if (error.message === "canceled") {
          console.log(`---> baidu detect canceled`);
          return reject(undefined);
        }

        console.error(`---> web Baidu language detect error: ${error}`);

        const errorInfo = getTypeErrorInfo(type, error);
        reject(errorInfo);
      });
  });
}

function getBaiduWebLanguageDetectErrorInfo(result: BaiduWebLanguageDetect): RequestErrorInfo {
  const errorCode = result.error;
  const errorInfo: RequestErrorInfo = {
    type: LanguageDetectType.Baidu,
    code: errorCode ? errorCode.toString() : "",
    message: result.msg || "",
  };

  return errorInfo;
}
