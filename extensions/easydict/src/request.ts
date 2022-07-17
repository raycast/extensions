import { deepLAuthKey } from "./crypto";
/*
 * @author: tisfeng
 * @createTime: 2022-06-26 11:13
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-07-17 18:40
 * @fileName: request.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import CryptoJS from "crypto-js";
import querystring from "node:querystring";
import * as tencentcloud from "tencentcloud-sdk-nodejs-tmt";
import {
  baiduAppId,
  baiduAppSecret,
  caiyunToken,
  tencentSecretId,
  tencentSecretKey,
  youdaoAppId,
  youdaoAppSecret,
} from "./crypto";

import { LanguageDetectType, LanguageDetectTypeResult } from "./detectLanguage";
import {
  BaiduTranslateResult,
  CaiyunTranslateResult,
  DeepLTranslateResult,
  RequestErrorInfo,
  RequestTypeResult,
  TencentTranslateResult,
  TranslateType,
} from "./types";
import { getLanguageItemFromYoudaoId } from "./utils";

const tencentEndpoint = "tmt.tencentcloudapi.com";
const tencentRegion = "ap-guangzhou";
const tencentProjectId = 0;
const TmtClient = tencentcloud.tmt.v20180321.Client;

const clientConfig = {
  credential: {
    secretId: tencentSecretId,
    secretKey: tencentSecretKey,
  },
  region: tencentRegion,
  profile: {
    httpProfile: {
      endpoint: tencentEndpoint,
    },
  },
};
const client = new TmtClient(clientConfig);

/**
 * Caclulate axios request cost time
 */
export const requestCostTime = "x-request-cost";
axios.interceptors.request.use(function (config: AxiosRequestConfig) {
  if (config.headers) {
    config.headers["request-startTime"] = new Date().getTime();
  }
  return config;
});
axios.interceptors.response.use(function (response) {
  if (response.config.headers) {
    const startTime = response.config.headers["request-startTime"] as number;
    const endTime = new Date().getTime();
    response.headers[requestCostTime] = (endTime - startTime).toString();
  }
  return response;
});

/**
 * 腾讯语种识别，5次/秒
 * Docs: https://cloud.tencent.com/document/product/551/15620?cps_key=1d358d18a7a17b4a6df8d67a62fd3d3d
 */
export async function tencentLanguageDetect(text: string): Promise<LanguageDetectTypeResult> {
  const params = {
    Text: text,
    ProjectId: tencentProjectId,
  };
  const startTime = new Date().getTime();
  try {
    const response = await client.LanguageDetect(params);
    const endTime = new Date().getTime();
    console.warn(`tencent detect cost time: ${endTime - startTime} ms`);
    const typeResult = {
      type: LanguageDetectType.Tencent,
      youdaoLanguageId: response.Lang || "",
      confirmed: false,
    };
    return Promise.resolve(typeResult);
  } catch (err) {
    const error = err as { code: string; message: string };
    console.error(`tencent detect error, code: ${error.code}, message: ${error.message}`);
    const errorInfo: RequestErrorInfo = {
      type: TranslateType.Tencent,
      code: error.code,
      message: error.message,
    };
    return Promise.reject(errorInfo);
  }
}

/**
 * 腾讯文本翻译，5次/秒
 * Docs: https://cloud.tencent.com/document/api/551/15619
 */
export async function requestTencentTextTranslate(
  queryText: string,
  fromLanguage: string,
  targetLanguage: string
): Promise<RequestTypeResult> {
  const from = getLanguageItemFromYoudaoId(fromLanguage).tencentLanguageId;
  const to = getLanguageItemFromYoudaoId(targetLanguage).tencentLanguageId;
  if (!from || !to) {
    console.warn(`Tencent translate not support language: ${fromLanguage} --> ${targetLanguage}`);
    return Promise.resolve({
      type: TranslateType.Tencent,
      result: null,
    });
  }
  const params = {
    SourceText: queryText,
    Source: from,
    Target: to,
    ProjectId: tencentProjectId,
  };
  const startTime = new Date().getTime();

  try {
    const response = await client.TextTranslate(params);
    const endTime = new Date().getTime();
    console.log(`Tencen translate: ${response.TargetText}, cost: ${endTime - startTime} ms`);
    const typeResult = {
      type: TranslateType.Tencent,
      result: response as TencentTranslateResult,
    };
    return Promise.resolve(typeResult);
  } catch (err) {
    // console.error(`tencent translate error: ${JSON.stringify(err, null, 2)}`);
    const error = err as { code: string; message: string };
    console.error(`Tencent translate error, code: ${error.code}, message: ${error.message}`);
    const errorInfo: RequestErrorInfo = {
      type: TranslateType.Tencent,
      code: error.code,
      message: error.message,
    };
    return Promise.reject(errorInfo);
  }
}

/**
 * 有道翻译
 * Docs: https://ai.youdao.com/DOCSIRMA/html/自然语言翻译/API文档/文本翻译服务/文本翻译服务-API文档.html
 */
export function requestYoudaoDictionary(
  queryText: string,
  fromLanguage: string,
  targetLanguage: string
): Promise<RequestTypeResult> {
  function truncate(q: string): string {
    const len = q.length;
    return len <= 20 ? q : q.substring(0, 10) + len + q.substring(len - 10, len);
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const salt = timestamp;
  const sha256Content = youdaoAppId + truncate(queryText) + salt + timestamp + youdaoAppSecret;
  const sign = CryptoJS.SHA256(sha256Content).toString();
  const url = "https://openapi.youdao.com/api";
  const params = querystring.stringify({
    sign,
    salt,
    from: fromLanguage,
    signType: "v3",
    q: queryText,
    appKey: youdaoAppId,
    curtime: timestamp,
    to: targetLanguage,
  });

  return new Promise((resolve, reject) => {
    axios
      .post(url, params)
      .then((response) => {
        console.log(`---> Youdao translate cost: ${response.headers[requestCostTime]} ms`);
        resolve({
          type: TranslateType.Youdao,
          result: response.data,
        });
      })
      .catch((error) => {
        // It seems that Youdao will never reject, always resolve...
        console.error(`youdao translate error: ${error}`);
        reject(error);
      });
  });
}

//
/**
 * 百度翻译API
 * Docs: https://fanyi-api.baidu.com/doc/21
 */
export function requestBaiduTextTranslate(
  queryText: string,
  fromLanguage: string,
  targetLanguage: string
): Promise<RequestTypeResult> {
  const salt = Math.round(new Date().getTime() / 1000);
  const md5Content = baiduAppId + queryText + salt + baiduAppSecret;
  const sign = CryptoJS.MD5(md5Content).toString();
  const url = "https://fanyi-api.baidu.com/api/trans/vip/translate";
  const from = getLanguageItemFromYoudaoId(fromLanguage).baiduLanguageId;
  const to = getLanguageItemFromYoudaoId(targetLanguage).baiduLanguageId;
  const encodeQueryText = Buffer.from(queryText, "utf8").toString();
  const params = {
    q: encodeQueryText,
    from: from,
    to: to,
    appid: baiduAppId,
    salt: salt,
    sign: sign,
  };
  return new Promise((resolve, reject) => {
    axios
      .get(url, { params })
      .then((response) => {
        const baiduResult = response.data as BaiduTranslateResult;
        if (baiduResult.trans_result) {
          const translateText = baiduResult.trans_result[0].dst;
          console.log(`Baidu translate: ${translateText}, cost: ${response.headers[requestCostTime]} ms`);
          resolve({
            type: TranslateType.Baidu,
            result: baiduResult,
          });
        } else {
          console.error(`baidu translate error: ${JSON.stringify(baiduResult)}`);
          const errorInfo: RequestErrorInfo = {
            type: TranslateType.Baidu,
            code: baiduResult.error_code || "",
            message: baiduResult.error_msg || "",
          };
          reject(errorInfo);
        }
      })
      .catch((err) => {
        // It seems that Baidu will never reject, always resolve...
        console.error(`baidu translate error: ${err}`);
        reject(err);
      });
  });
}

/**
 * 彩云小译
 * Docs: https://open.caiyunapp.com/%E4%BA%94%E5%88%86%E9%92%9F%E5%AD%A6%E4%BC%9A%E5%BD%A9%E4%BA%91%E5%B0%8F%E8%AF%91_API
 */
export function requestCaiyunTextTranslate(
  queryText: string,
  fromLanguage: string,
  targetLanguage: string
): Promise<RequestTypeResult> {
  const url = "https://api.interpreter.caiyunai.com/v1/translator";
  const from = getLanguageItemFromYoudaoId(fromLanguage).caiyunLanguageId || "auto";
  const to = getLanguageItemFromYoudaoId(targetLanguage).caiyunLanguageId;
  const trans_type = `${from}2${to}`; // "auto2xx";

  // Note that Caiyun Translate only supports these types of translation at present.
  const supportedTranslatType = ["zh2en", "zh2ja", "en2zh", "ja2zh"];
  if (!supportedTranslatType.includes(trans_type)) {
    console.warn(`Caiyun translate not support language: ${fromLanguage} --> ${targetLanguage}`);
    return Promise.resolve({
      type: TranslateType.Caiyun,
      result: null,
    });
  }

  const params = {
    source: queryText.split("\n"), // source can be text or array. if source is an array, it will be translated in parallel
    trans_type,
    detect: from === "auto",
  };
  const headers = {
    headers: {
      "content-type": "application/json",
      "x-authorization": "token " + caiyunToken,
    },
  };
  return new Promise((resolve, reject) => {
    axios
      .post(url, params, headers)
      .then((response) => {
        const caiyunResult = response.data as CaiyunTranslateResult;
        console.log(`caiyun translate: ${caiyunResult.target}, cost: ${response.headers[requestCostTime]} ms`);
        resolve({
          type: TranslateType.Caiyun,
          result: caiyunResult,
        });
      })
      .catch((error) => {
        const errorInfo: RequestErrorInfo = {
          type: TranslateType.Caiyun,
          code: error.response.status.toString(),
          message: error.response.statusText,
        };
        reject(errorInfo);
        console.error("caiyun error response: ", error.response);
      });
  });
}

/**
 * DeepL translate API
 * https://www.deepl.com/zh/docs-api/translating-text
 */
export async function requestDeepLTextTranslate(
  queryText: string,
  fromLanguage: string,
  targetLanguage: string
): Promise<RequestTypeResult> {
  const sourceLang = getLanguageItemFromYoudaoId(fromLanguage).deepLSourceLanguageId;
  const targetLang =
    getLanguageItemFromYoudaoId(targetLanguage).deepLSourceLanguageId ||
    getLanguageItemFromYoudaoId(targetLanguage).deepLTargetLanguageId;

  // if language is not supported, return null
  if (!sourceLang || !targetLang) {
    console.warn(`DeepL translate not support language: ${fromLanguage} --> ${targetLanguage}`);
    return Promise.resolve({
      type: TranslateType.DeepL,
      result: null,
    });
  }

  // * deepL api free and deepL pro api use different url host.
  const url = deepLAuthKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
  const params = {
    auth_key: deepLAuthKey,
    text: queryText,
    source_lang: sourceLang,
    target_lang: targetLang,
  };
  // console.log(`---> deepL params: ${JSON.stringify(params, null, 4)}`);

  try {
    const response = await axios.post(url, querystring.stringify(params));
    const deepLResult = response.data as DeepLTranslateResult;
    const translatedText = deepLResult.translations[0].text;
    console.log(
      `DeepL translate: ${JSON.stringify(translatedText, null, 4)}, length: ${translatedText.length}, cost: ${
        response.headers[requestCostTime]
      } ms`
    );
    return Promise.resolve({
      type: TranslateType.DeepL,
      result: deepLResult,
    });
  } catch (err) {
    const error = err as { response: AxiosResponse };
    console.error("deepL error: ", JSON.stringify(error.response, null, 4));
    const errorInfo: RequestErrorInfo = {
      type: TranslateType.DeepL,
      code: error.response.status.toString(),
      message: error.response.statusText,
    };
    console.warn("deepL error info: ", errorInfo);
    return Promise.reject(errorInfo);
  }
}
