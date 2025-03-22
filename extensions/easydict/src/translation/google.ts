/*
 * @author: tisfeng
 * @createTime: 2022-08-05 16:09
 * @lastEditor: tisfeng
 * @lastEditTime: 2023-03-14 21:31
 * @fileName: google.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { translate as googleTranslateApi } from "@vitalets/google-translate-api";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import querystring from "node:querystring";
import { getProxyAgent, getSystemProxyURL, httpsAgent } from "../axiosConfig";
import { userAgent } from "../consts";
import { DetectedLangModel, LanguageDetectType } from "../detectLanguage/types";
import { QueryWordInfo } from "../dictionary/youdao/types";
import { autoDetectLanguageItem, englishLanguageItem } from "../language/consts";
import { getGoogleLangCode, getYoudaoLangCodeFromGoogleCode } from "../language/languages";
import { GoogleTranslateResult, QueryTypeResult, RequestErrorInfo, TranslationType } from "../types";
import { getTypeErrorInfo } from "../utils";

console.log(`enter google.ts`);

export function requestGoogleTranslate(queryWordInfo: QueryWordInfo, signal?: AbortSignal): Promise<QueryTypeResult> {
  console.log(`---> start request Google`);
  // return googleRPCTranslate(queryWordInfo, signal);
  return googleWebTranslate(queryWordInfo, signal);
}

/**
 * Google RPC translate, can get richer word dictionary and automatic recognition feature.
 *
 * * Google RPC cost more time than web translate. almost 1s > 0.4s.
 */
async function googleRPCTranslate(queryWordInfo: QueryWordInfo, signal?: AbortSignal): Promise<QueryTypeResult> {
  console.log(`start google RPC translate`);

  const { word, fromLanguage, toLanguage } = queryWordInfo;
  const fromLanguageId = getGoogleLangCode(fromLanguage);
  const toLanguageId = getGoogleLangCode(toLanguage);

  // Since translate.google.cn is not available anymore, we try to use proxy by default.
  const httpsAgent = await getProxyAgent();
  return new Promise((resolve, reject) => {
    const startTime = new Date().getTime();
    googleTranslateApi(word, {
      from: fromLanguageId,
      to: toLanguageId,
      fetchOptions: {
        agent: httpsAgent,
        signal: signal,
      },
    })
      .then((res) => {
        console.warn(`---> Google RPC translate: ${res.text}, cost ${new Date().getTime() - startTime} ms`);
        const result: QueryTypeResult = {
          type: TranslationType.Google,
          result: res,
          translations: res.text.split("\n"),
          queryWordInfo: queryWordInfo,
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

        getSystemProxyURL();
      });
  });
}

/**
 * Google language detect. Actually, it uses google RPC translate api to detect language.
 */
export function googleDetect(text: string, signal = axios.defaults.signal): Promise<DetectedLangModel> {
  console.warn(`---> start Google detect: ${text}`);

  const startTime = new Date().getTime();
  const queryWordInfo: QueryWordInfo = {
    word: text,
    fromLanguage: autoDetectLanguageItem.googleLangCode,
    toLanguage: englishLanguageItem.googleLangCode,
  };

  return new Promise((resolve, reject) => {
    googleRPCTranslate(queryWordInfo, signal as AbortSignal)
      .then((googleTypeResult) => {
        const googleResult = googleTypeResult.result as GoogleTranslateResult;
        const googleLanguageId = googleResult.raw.ld_result.srclangs[0];
        const youdaoLanguageId = getYoudaoLangCodeFromGoogleCode(googleLanguageId);
        console.warn(`---> Google detect language: ${googleLanguageId}, youdaoId: ${youdaoLanguageId}`);
        console.log(`google detect cost time: ${new Date().getTime() - startTime} ms`);

        const languagedDetectResult: DetectedLangModel = {
          type: LanguageDetectType.Google,
          sourceLangCode: googleLanguageId,
          youdaoLangCode: youdaoLanguageId,
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
export async function googleWebTranslate(queryWordInfo: QueryWordInfo, signal?: AbortSignal): Promise<QueryTypeResult> {
  console.log(`start google web translate`);

  const fromLanguageId = getGoogleLangCode(queryWordInfo.fromLanguage);
  const toLanguageId = getGoogleLangCode(queryWordInfo.toLanguage);
  const data = {
    sl: fromLanguageId, // source language
    tl: toLanguageId, // target language
    hl: toLanguageId, // hope language? web ui language
    q: queryWordInfo.word, // query word
  };

  const headers = {
    "User-Agent": userAgent,
  };
  const url = `https://translate.google.com/m?${querystring.stringify(data)}`;
  console.log(`---> google web url: ${url}`); // https://translate.google.com/m?sl=auto&tl=zh-CN&hl=zh-CN&q=good

  const config: AxiosRequestConfig = {
    headers,
    signal,
    httpsAgent,
  };

  return new Promise((resolve, reject) => {
    axios
      .get(url, config)
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
          queryWordInfo: queryWordInfo,
        };
        resolve(result);
      })
      .catch((error) => {
        if (error.message === "canceled") {
          console.log(`---> google web translate cancelled`);
          return reject(undefined);
        }
        console.error(`google web error: ${error}`);

        const errorInfo: RequestErrorInfo = {
          type: TranslationType.Google,
          message: "Google web translate error",
        };

        reject(errorInfo);

        // getSystemProxyURL();
      });
  });
}
