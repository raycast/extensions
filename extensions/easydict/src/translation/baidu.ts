/*
 * @author: tisfeng
 * @createTime: 2022-08-03 10:18
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-03 00:54
 * @fileName: baidu.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import axios, { AxiosError } from "axios";
import CryptoJS from "crypto-js";
import { requestCostTime } from "../axiosConfig";
import { LanguageDetectType, LanguageDetectTypeResult } from "../detectLanauge/types";
import { QueryWordInfo } from "../dictionary/youdao/types";
import { getBaiduLanguageId, getYoudaoLanguageIdFromBaiduId } from "../language/languages";
import { KeyStore } from "../preferences";
import { BaiduTranslateResult, QueryTypeResult, RequestErrorInfo, TranslationType } from "../types";
import { getTypeErrorInfo } from "../utils";

/**
 * Baidu translate. Cost time: ~0.4s
 *
 * 百度翻译API https://fanyi-api.baidu.com/doc/21
 */
export function requestBaiduTextTranslate(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  console.log(`---> start request Baidu`);
  const { fromLanguage, toLanguage, word } = queryWordInfo;
  const salt = Math.round(new Date().getTime() / 1000);
  const baiduAppId = KeyStore.baiduAppId;
  const md5Content = baiduAppId + word + salt + KeyStore.baiduAppSecret;
  const sign = CryptoJS.MD5(md5Content).toString();
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
  return new Promise((resolve, reject) => {
    axios
      .get(url, { params })
      .then((response) => {
        const baiduResult = response.data as BaiduTranslateResult;
        // console.log(`---> baiduResult: ${JSON.stringify(baiduResult, null, 4)}`);
        if (baiduResult.trans_result) {
          const translations = baiduResult.trans_result.map((item) => item.dst);
          console.warn(`Baidu translate: ${translations}`);
          console.log(`fromLang: ${baiduResult.from}, cost: ${response.headers[requestCostTime]} ms`);
          const result: QueryTypeResult = {
            type: TranslationType.Baidu,
            result: baiduResult,
            translations: translations,
            wordInfo: queryWordInfo,
          };
          resolve(result);
        } else {
          console.error(`baidu translate error: ${JSON.stringify(baiduResult)}`); //  {"error_code":"54001","error_msg":"Invalid Sign"}
          const errorInfo: RequestErrorInfo = {
            type: TranslationType.Baidu,
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
        const errorInfo = getTypeErrorInfo(TranslationType.Baidu, error);
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
 */
export async function baiduLanguageDetect(text: string): Promise<LanguageDetectTypeResult> {
  console.log(`---> start request Baidu language detect`);

  const queryWordInfo: QueryWordInfo = {
    fromLanguage: "auto",
    toLanguage: "zh",
    word: text,
  };

  try {
    const baiduTypeResult = await requestBaiduTextTranslate(queryWordInfo);
    const baiduResult = baiduTypeResult.result as BaiduTranslateResult;
    const baiduLanaugeId = baiduResult.from || "";
    const youdaoLanguageId = getYoudaoLanguageIdFromBaiduId(baiduLanaugeId);
    console.warn(`---> Baidu detect languageId: ${baiduLanaugeId}, youdaoId: ${youdaoLanguageId}`);

    /**
     * Generally speaking, Baidu language auto-detection is more accurate than Tencent language recognition.
     * Baidu language recognition is inaccurate in very few cases, such as "ragazza", it should be Italian, but Baidu auto detect is en.
     * In this case, trans_result's src === dst.
     */
    let confirmed = false;
    const transResult = baiduResult.trans_result;
    if (transResult?.length) {
      const firstTransResult = transResult[0];
      confirmed = firstTransResult.dst !== firstTransResult.src;
    }
    const detectedLanguageResult: LanguageDetectTypeResult = {
      type: LanguageDetectType.Baidu,
      sourceLanguageId: baiduLanaugeId,
      youdaoLanguageId: youdaoLanguageId,
      confirmed: confirmed,
      result: baiduResult,
    };
    return Promise.resolve(detectedLanguageResult);
  } catch (error) {
    const errorInfo = error as RequestErrorInfo | undefined;
    if (errorInfo) {
      console.error(`---> baidu language detect error: ${JSON.stringify(error)}`);
      errorInfo.type = LanguageDetectType.Baidu; // * Note: need to set language detect type.
    }
    return Promise.reject(errorInfo);
  }
}
