/*
 * @author: tisfeng
 * @createTime: 2022-09-17 10:35
 * @lastEditor: tisfeng
 * @lastEditTime: 2023-03-17 10:12
 * @fileName: bing.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { LocalStorage } from "@raycast/api";
import axios, { AxiosRequestConfig } from "axios";
import qs from "qs";
import { requestCostTime } from "../../axiosConfig";
import { userAgent } from "../../consts";
import { DetectedLangModel, LanguageDetectType } from "../../detectLanguage/types";
import { QueryWordInfo } from "../../dictionary/youdao/types";
import { autoDetectLanguageItem, englishLanguageItem } from "../../language/consts";
import { getBingLangCode, getYoudaoLangCodeFromBingCode } from "../../language/languages";
import { myPreferences } from "../../preferences";
import { QueryTypeResult, RequestErrorInfo, TranslationType } from "../../types";
import { getTypeErrorInfo } from "../../utils";
import { BingConfig, BingTranslateResult } from "./types";

console.log(`enter bing.ts`);

const bingConfigKey = "BingConfig";
let bingConfig: BingConfig | undefined;

const defaultBingHost = "www.bing.com";

// * bing host depends ip, if ip is in china, `must` use cn.bing.com, otherwise use www.bing.com. And vice versa.
let bingHost = myPreferences.bingHost || defaultBingHost;

let retryCount = 0;

/**
 * Request Microsoft Bing Web Translator.
 */
export async function requestWebBingTranslate(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  console.log(`start requestWebBingTranslate`);

  const { fromLanguage, toLanguage, word } = queryWordInfo;
  const fromLang = getBingLangCode(fromLanguage);
  const toLang = getBingLangCode(toLanguage);

  const type = TranslationType.Bing;

  const isExpired = await checkIfBingTokenExpired();
  console.log(`bing token expired: ${isExpired}`);

  if (isExpired) {
    console.log(`bing token expired, request new one`);
    bingConfig = await requestBingConfig();
  } else {
    const storedBingConfig = await LocalStorage.getItem<string>(bingConfigKey);
    if (storedBingConfig) {
      bingConfig = JSON.parse(storedBingConfig) as BingConfig;
      console.log(`use stored bingConfig: ${JSON.stringify(bingConfig, null, 4)}`);
    }
  }

  if (!bingConfig) {
    console.error(`get bingConfig failed`);

    const errorInfo: RequestErrorInfo = {
      type: type,
      message: "Get bing config failed",
    };

    return Promise.reject(errorInfo);
  }

  // console.log(`request with bingConfig: ${JSON.stringify(bingConfig, null, 4)}`);
  const { IID, IG, key, token, count } = bingConfig;
  const requestCount = count + 1;
  bingConfig.count = requestCount;
  LocalStorage.setItem(bingConfigKey, JSON.stringify(bingConfig));

  const data = {
    text: word,
    fromLang: fromLang,
    to: toLang,
    token: token,
    key: key,
  };
  // console.log(`bing request data: ${JSON.stringify(data, null, 4)}`);

  const IIDString = `${IID}.${requestCount}`;

  const url = `https://${bingHost}/ttranslatev3?isVertical=1&IG=${IG}&IID=${IIDString}`;
  console.log(`bing url: ${url}`);

  const config: AxiosRequestConfig = {
    method: "post",
    url: url,
    headers: {
      "User-Agent": userAgent,
    },
    data: qs.stringify(data),
  };

  return new Promise((resolve, reject) => {
    axios(config)
      .then(function (response) {
        const finalUrl = response.request.res.responseUrl;
        console.log(`bing finalUrl: ${finalUrl}`);

        // Get new host
        const newBingHost = new URL(finalUrl).host;
        const responseData = response.data;
        console.warn(`bing translate cost time: ${response.headers[requestCostTime]}`);

        // If bing translate response is empty, may be ip has been changed, bing tld is not correct, so check ip again, then request again.
        if (!responseData) {
          if (bingHost !== newBingHost && retryCount < 3) {
            console.warn(
              `bing translate response is empty, change to use new host: ${bingHost}, then request again, retryCount: ${retryCount}`,
            );
            retryCount++;
            requestBingConfig().then((bingConfig) => {
              if (bingConfig) {
                requestWebBingTranslate(queryWordInfo)
                  .then((result) => resolve(result))
                  .catch((error) => reject(error));
              } else {
                return reject({
                  type: TranslationType.Bing,
                  message: "Bing translate response is empty, get bing config failed",
                } as RequestErrorInfo);
              }
            });
          } else {
            return reject({
              type: TranslationType.Bing,
              message: "Bing translate response is empty",
            } as RequestErrorInfo);
          }
        } else {
          retryCount = 0;

          console.log(`bing response: ${JSON.stringify(responseData, null, 4)}`);
          const bingTranslateResult = responseData[0] as BingTranslateResult;
          const translations = bingTranslateResult.translations[0].text.split("\n");
          const detectedLanguage = bingTranslateResult.detectedLanguage.language;
          const toLanguage = bingTranslateResult.translations[0].to;
          console.log(`bing translate: ${translations}, from: ${detectedLanguage} -> ${toLanguage}`);

          const result: QueryTypeResult = {
            type: type,
            queryWordInfo: queryWordInfo,
            result: bingTranslateResult,
            translations: translations,
          };
          resolve(result);
        }
      })
      .catch(function (error) {
        if (error.message === "canceled") {
          console.log(`---> bing canceled`);
          return reject(undefined);
        }

        console.error(`---> bing translate error: ${error}`);
        const errorInfo = getTypeErrorInfo(type, error);
        reject(errorInfo);
      });
  });
}

/**
 * Bing language detect, use bing translate `audo-detect`.
 */
export async function bingDetect(text: string): Promise<DetectedLangModel> {
  console.log(`start bingDetect`);

  const queryWordInfo: QueryWordInfo = {
    word: text,
    fromLanguage: autoDetectLanguageItem.bingLangCode,
    toLanguage: englishLanguageItem.bingLangCode,
  };
  const type = LanguageDetectType.Bing;

  return new Promise((resolve, reject) => {
    requestWebBingTranslate(queryWordInfo)
      .then((result) => {
        const bingTranslateResult = result.result as BingTranslateResult;
        const detectedLanguageCode = bingTranslateResult.detectedLanguage.language;
        const youdaoLangCode = getYoudaoLangCodeFromBingCode(detectedLanguageCode);
        console.warn(`bing detect language: ${detectedLanguageCode}, youdaoLangCode: ${youdaoLangCode}`);

        const detectedLanguageResult: DetectedLangModel = {
          type: type,
          sourceLangCode: detectedLanguageCode,
          youdaoLangCode: youdaoLangCode,
          confirmed: false,
          result: bingTranslateResult,
        };
        resolve(detectedLanguageResult);
      })
      .catch((error) => {
        const errorInfo = error as RequestErrorInfo | undefined;
        if (errorInfo) {
          console.error(`---> bing detect error: ${JSON.stringify(error)}`);
          errorInfo.type = type;
        }
        reject(errorInfo);
      });
  });
}

/**
 * Request Bing Translator API Token from web, and store it.
 *
 * Ref: https://github.com/plainheart/bing-translate-api/blob/master/src/index.js
 */
async function requestBingConfig(): Promise<BingConfig | undefined> {
  console.log(`start requestBingConfig`);
  console.log(`config bingTld: ${bingHost}`);

  return new Promise((resolve) => {
    const url = `https://${bingHost}/translator`;
    console.log(`get bing config url: ${url}`);

    axios
      .get(url, { headers: { "User-Agent": userAgent } })
      .then((response) => {
        const html = response.data as string;
        const config = parseBingConfig(html);
        console.log(`get bing config cost time: ${response.headers[requestCostTime]}`);

        if (config) {
          bingConfig = config;
          resolve(config);
          console.log(`getBingConfig from web: ${JSON.stringify(config, null, 4)}`);
          LocalStorage.setItem(bingConfigKey, JSON.stringify(config));
        } else {
          console.warn(`parse bing config failed, html: ${html}`);
          console.log(`try check if ip in china`);

          const finalUrl = response.request.res.responseUrl;
          bingHost = new URL(finalUrl).host;

          console.warn(`get bing config failed, host: ${bingHost}, change host, then request again`);
          requestBingConfig()
            .then((result) => resolve(result))
            .catch(() => resolve(undefined));
        }
      })
      .catch((error) => {
        console.error(`requestBingConfig error: ${error}`);
        resolve(undefined);
      });
  });
}

/**
 * Parse bing config from html.
 */
function parseBingConfig(html: string): BingConfig | undefined {
  // IG:"C064D2C8D4F84111B96C9F14E2F5CE07"
  const IG = html.match(/IG:"(.*?)"/)?.[1];
  // data-iid="translator.5023"
  const IID = html.match(/data-iid="(.*?)"/)?.[1];
  // var params_AbusePreventionHelper = [1663259642763, "ETrbGhqGa5PwV8WL3sTYSBxsYRagh5bl", 3600000, true, null, false, "必应翻译", false, false, null, null];
  const params_AbusePreventionHelper = html.match(/var params_AbusePreventionHelper = (.*?);/)?.[1];
  if (IG && params_AbusePreventionHelper) {
    const paramsArray = JSON.parse(params_AbusePreventionHelper);
    const [key, token, expirationInterval] = paramsArray;
    const config: BingConfig = {
      IG: IG,
      IID: IID || "translator.5023",
      key: key,
      token: token,
      expirationInterval: expirationInterval,
      count: 1,
    };
    // console.log(`getBingConfig from web: ${JSON.stringify(config, null, 4)}`);

    bingConfig = config;
    LocalStorage.setItem(bingConfigKey, JSON.stringify(config));
    return config;
  }
}

/**
 * Check if token expired, if expired, get a new one. else use the stored one as bingConfig.
 */
async function checkIfBingTokenExpired(): Promise<boolean> {
  console.log(`check if bing token expired`);
  const value = await LocalStorage.getItem<string>(bingConfigKey);
  if (!value) {
    requestBingConfig();
    return true;
  }

  // console.log(`stored bingConfig: ${JSON.stringify(value, null, 4)}`);
  const config = JSON.parse(value) as BingConfig;
  const { key, expirationInterval } = config;
  const tokenStartTime = parseInt(key);
  const expiration = parseInt(expirationInterval);
  // default expiration is 10 min, for better experience, we get a new token after 5 min.
  const tokenUsedTime = Date.now() - tokenStartTime;
  const isExpired = tokenUsedTime > expiration;
  if (isExpired) {
    console.log(`bing token expired, request new one`);
    requestBingConfig();
  } else {
    bingConfig = config;
    if (tokenUsedTime > expiration / 2) {
      requestBingConfig();
    }
  }
  return isExpired;
}
