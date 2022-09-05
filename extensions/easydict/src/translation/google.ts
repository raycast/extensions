/*
 * @author: tisfeng
 * @createTime: 2022-08-05 16:09
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-02 23:51
 * @fileName: google.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import googleTranslateApi from "@vitalets/google-translate-api";
import axios, { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import { HttpsProxyAgent } from "https-proxy-agent";
import querystring from "node:querystring";
import { requestCostTime } from "../axiosConfig";
import { userAgent } from "../consts";
import { checkIfPreferredLanguagesContainedChinese } from "../detectLanauge/utils";
import { QueryWordInfo } from "../dictionary/youdao/types";
import { getGoogleLanguageId, getYoudaoLanguageIdFromGoogleId } from "../language/languages";
import { QueryTypeResult, RequestErrorInfo, TranslationType } from "../types";
import { getTypeErrorInfo } from "../utils";
import { LanguageDetectType, LanguageDetectTypeResult } from "./../detectLanauge/types";
import { GoogleTranslateResult } from "./../types";

export async function requestGoogleTranslate(
  queryWordInfo: QueryWordInfo,
  signal: AbortSignal | undefined
): Promise<QueryTypeResult> {
  console.log(`---> start request Google`);
  const tld = await getTld();
  queryWordInfo.tld = tld;

  // googleRPCTranslate(queryWordInfo, signal);
  return googleWebTranslate(queryWordInfo, signal);
}

/**
 * Google RPC translate, can get richer word dictionary and automatic recognition feature.
 *
 * * Google RPC cost more time than web translate. almost 1s > 0.4s.
 */
async function googleRPCTranslate(
  queryWordInfo: QueryWordInfo,
  signal: AbortSignal | undefined
): Promise<QueryTypeResult> {
  const { word, fromLanguage, toLanguage } = queryWordInfo;
  const fromLanguageId = getGoogleLanguageId(fromLanguage);
  const toLanguageId = getGoogleLanguageId(toLanguage);
  const tld = queryWordInfo.tld ?? (await getTld());
  queryWordInfo.tld = tld;

  const proxy = process.env.PROXY || undefined;
  const httpsAgent = proxy ? new HttpsProxyAgent(proxy) : undefined;
  // console.warn(`---> proxy: ${proxy}, httpsAgent: ${JSON.stringify(httpsAgent, null, 4)}`);

  return new Promise((resolve, reject) => {
    const startTime = new Date().getTime();
    googleTranslateApi(word, { from: fromLanguageId, to: toLanguageId, tld: tld }, { signal, agent: httpsAgent })
      .then((res) => {
        console.warn(`---> Google RPC translate: ${res.text}, cost ${new Date().getTime() - startTime} ms`);
        const result: QueryTypeResult = {
          type: TranslationType.Google,
          result: res,
          translations: res.text.split("\n"),
          wordInfo: queryWordInfo,
        };
        resolve(result);
      })
      .catch((error) => {
        // * got use a different error meassage from axios.
        if (error.message.includes("The operation was aborted")) {
          console.log(`---> google rpc aborted`);
          return reject(undefined);
        }

        console.error(`google rpc error message: ${error.message}`);
        console.error(`googleRPCTranslate error: ${JSON.stringify(error, null, 4)}`);
        const errorInfo = getTypeErrorInfo(TranslationType.Google, error);
        reject(errorInfo);
      });
  });
}

/**
 * Google language detect. Actually, it uses google RPC translate api to detect language.
 */
export async function googleLanguageDetect(
  text: string,
  signal: AbortSignal | undefined
): Promise<LanguageDetectTypeResult> {
  console.log(`---> start Google language detect: ${text}`);
  const startTime = new Date().getTime();
  const queryWordInfo: QueryWordInfo = {
    word: text,
    fromLanguage: "auto",
    toLanguage: "en",
  };

  return new Promise((resolve, reject) => {
    googleRPCTranslate(queryWordInfo, signal)
      .then((googleTypeResult) => {
        const googleResult = googleTypeResult.result as GoogleTranslateResult;
        const googleLanguageId = googleResult.from.language.iso;
        const youdaoLanguageId = getYoudaoLanguageIdFromGoogleId(googleLanguageId);
        console.warn(
          `---> Google detect language: ${googleLanguageId}, youdaoId: ${youdaoLanguageId}, cost ${
            new Date().getTime() - startTime
          } ms`
        );
        const languagedDetectResult: LanguageDetectTypeResult = {
          type: LanguageDetectType.Google,
          sourceLanguageId: googleLanguageId,
          youdaoLanguageId: youdaoLanguageId,
          confirmed: true,
          result: googleResult,
        };
        resolve(languagedDetectResult);
      })
      .catch((error) => {
        if (!error) {
          console.log(`---> google detect aborted`);
          return reject(undefined);
        }

        console.error(`googleLanguageDetect error: ${JSON.stringify(error)}`);
        const errorInfo = error as RequestErrorInfo;
        errorInfo.type = LanguageDetectType.Google;
        reject(errorInfo);
      });
  });
}

/**
 * Use crawler to get google web translate. Only simple translate result.
 *
 * * Note: max translated text length should <= 1830
 * * Otherwise will throw error: "400. That’s an error. Your client has issued a malformed or illegal request. That’s all we know."
 *
 * From https://github.com/roojay520/bobplugin-google-translate/blob/master/src/google-translate-mobile.ts
 * Another wild google translate api: http://translate.google.com/translate_a/single?client=gtx&dt=t&dj=1&ie=UTF-8&sl=auto&tl=zh_TW&q=good
 */
export async function googleWebTranslate(
  queryWordInfo: QueryWordInfo,
  signal: AbortSignal | undefined
): Promise<QueryTypeResult> {
  const fromLanguageId = getGoogleLanguageId(queryWordInfo.fromLanguage);
  const toLanguageId = getGoogleLanguageId(queryWordInfo.toLanguage);
  const data = {
    sl: fromLanguageId, // source language
    tl: toLanguageId, // target language
    hl: toLanguageId, // hope language? web ui language
    q: queryWordInfo.word, // query word
  };
  const tld = queryWordInfo.tld ?? (await getTld());
  queryWordInfo.tld = tld;

  const headers = {
    "User-Agent": userAgent,
  };
  const url = `https://translate.google.${tld}/m?${querystring.stringify(data)}`;
  console.log(`---> google url: ${url}`); // https://translate.google.cn/m?sl=auto&tl=zh-CN&hl=zh-CN&q=good

  return new Promise<QueryTypeResult>((resolve, reject) => {
    axios
      .get(url, { headers, signal })
      .then((res: AxiosResponse) => {
        const hmlt = res.data;
        const $ = cheerio.load(hmlt);

        // <div class="result-container">好的</div>
        const translation = $(".result-container").text();
        const translations = translation.split("\n");
        console.warn(`---> google web translation: ${translation}, cost: ${res.headers["requestCostTime"]} ms`);
        const result: QueryTypeResult = {
          type: TranslationType.Google,
          result: { translatedText: translation },
          translations: translations,
          wordInfo: queryWordInfo,
        };
        resolve(result);
      })
      .catch((error) => {
        if (error.message === "canceled") {
          console.log(`---> google cancelled`);
          return reject(undefined);
        }
        console.error(`google web error: ${error}`);

        const errorInfo: RequestErrorInfo = {
          type: TranslationType.Google,
          message: "Google web translate error",
        };

        reject(errorInfo);
      });
  });
}

/**
 * Get tld. if user has preferred Chinese language or ip in China, use cn, else use com.
 */
async function getTld(): Promise<string> {
  let tld = "com"; // cn,com
  if (checkIfPreferredLanguagesContainedChinese() || (await checkIfIpInChina())) {
    tld = "cn";
    console.log(`---> China, or Chinese: ${checkIfPreferredLanguagesContainedChinese()}`);
  }
  console.log(`---> google tld: ${tld}`);
  return tld;
}

/**
 * Get current ip address.
 */
export async function getCurrentIp(): Promise<string> {
  const url = "http://icanhazip.com/"; // from https://blog.csdn.net/uikoo9/article/details/113820051
  try {
    const res = await axios.get(url);
    const ip = res.data.trim();
    console.warn(`---> current ip: ${ip}, cost ${res.headers["requestCostTime"]} ms`);
    return Promise.resolve(ip);
  } catch (error) {
    console.error(`getCurrentIp error: ${error}`);
    return Promise.reject(error);
  }
}

/**
 *  Check if ip is in China.
 *
 *  Todo: should store ip in LocalStorage.
 */
async function checkIfIpInChina(): Promise<boolean> {
  try {
    const ipInfo = await getCurrentIpInfo();
    const country = ipInfo.country;
    console.warn(`---> country: ${country}`);
    return Promise.resolve(country === "CN");
  } catch (error) {
    console.error(`checkIfIpInChina error: ${error}`);
    return Promise.resolve(true);
  }
}

/**
 * Get current ip info.
 * 
 * curl https://ipinfo.io
{
  "ip": "120.240.53.42",
  "city": "Zhanjiang",
  "region": "Guangdong",
  "country": "CN",
  "loc": "21.2339,110.3875",
  "org": "AS9808 China Mobile Communications Group Co., Ltd.",
  "timezone": "Asia/Shanghai",
  "readme": "https://ipinfo.io/missingauth"
}
 */
async function getCurrentIpInfo() {
  try {
    const url = "https://ipinfo.io";
    const res = await axios.get(url);
    console.warn(`---> ip info: ${JSON.stringify(res.data, null, 4)}, cost ${res.headers[requestCostTime]} ms`);
    return Promise.resolve(res.data);
  } catch (error) {
    console.error(`getCurrentIp error: ${error}`);
    return Promise.reject(error);
  }
}
