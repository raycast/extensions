/*
 * @author: tisfeng
 * @createTime: 2022-07-24 17:58
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-10-07 23:54
 * @fileName: linguee.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { LocalStorage } from "@raycast/api";
import axios, { AxiosError, AxiosRequestConfig, AxiosRequestHeaders } from "axios";
import util from "util";
import { httpsAgent, requestCostTime } from "../../axiosConfig";
import { userAgent } from "../../consts";
import { DicionaryType, QueryTypeResult } from "../../types";
import { getTypeErrorInfo } from "../../utils";
import { QueryWordInfo } from "../youdao/types";
import { getLingueeWebDictionaryURL, parseLingueeHTML } from "./parse";
import { LingueeDictionaryResult } from "./types";

export const lingueeRequestTimeKey = "lingueeRequestTimeKey";

/**
 * Get linguee dictionary result. cost time: > 2s.
 *
 * eg. good: https://www.linguee.com/english-chinese/search?source=auto&query=good
 */
export async function rquestLingueeDictionary(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  console.log(`---> start request Linguee`);

  const lingueeUrl = getLingueeWebDictionaryURL(queryWordInfo);
  console.log(`---> linguee url: ${lingueeUrl}`);
  if (!lingueeUrl) {
    const result: QueryTypeResult = {
      type: DicionaryType.Linguee,
      result: undefined,
      translations: [],
      queryWordInfo: queryWordInfo,
    };
    return Promise.resolve(result);
  }

  return new Promise((resolve, reject) => {
    // * avoid linguee's anti-spider, otherwise it will reponse very slowly or even error.
    const headers: AxiosRequestHeaders = {
      "User-Agent": userAgent,
      // withCredentials: true,
    };
    const config: AxiosRequestConfig = {
      headers: headers,
      responseType: "arraybuffer", // handle French content-type iso-8859-15
      httpsAgent, // use proxy, if ip was blocked by linguee, we can change ip.
    };

    axios
      .get(lingueeUrl, config)
      .then((response) => {
        recordLingueeRequestTime();

        const contentType = response.headers["content-type"];
        const data: Buffer = response.data;
        const html = data.toString(contentType.includes("iso-8859-15") ? "latin1" : "utf-8");
        const lingueeTypeResult = parseLingueeHTML(html);
        console.warn(`---> linguee cost: ${response.headers[requestCostTime]} ms`);

        /**
         * Generally, the language of the queryWordInfo is the language of the dictionary result.
         * But sometimes, linguee detect language may be wrong when word item is empty, so we use queryWordInfo language.
         * eg. sql, auto detect is chinese -> english.
         */
        const lingueeDictionaryResult = lingueeTypeResult.result as LingueeDictionaryResult;
        if (lingueeDictionaryResult && lingueeDictionaryResult.wordItems.length === 0) {
          const wordInfo = lingueeDictionaryResult.queryWordInfo;
          lingueeDictionaryResult.queryWordInfo = {
            ...wordInfo,
            word: queryWordInfo.word,
            fromLanguage: queryWordInfo.fromLanguage,
            toLanguage: queryWordInfo.toLanguage,
          };
        }
        resolve(lingueeTypeResult);
      })
      .catch((error: AxiosError) => {
        if (error.message === "canceled") {
          console.log(`---> linguee canceled`);
          return reject(undefined);
        }
        console.error(`---> linguee error: ${error}`);
        console.error(`---> error response: ${util.inspect(error.response, { depth: null })}`);

        const errorInfo = getTypeErrorInfo(DicionaryType.Linguee, error);
        const errorCode = error.response?.status;
        // Request failed with status code 503, this means your ip is banned by linguee for a few hours.
        if (errorCode === 503) {
          errorInfo.message = "Your ip is banned by linguee for a few hours. Please try to use proxy.";
          resetLingueeRequestTime();
        }
        reject(errorInfo);
      });
  });
}

/**
 * Record linguee reqeust times.
 */
async function recordLingueeRequestTime() {
  const lingueeRequestTime = (await LocalStorage.getItem<number>(lingueeRequestTimeKey)) || 1;
  console.log(`---> linguee has requested times: ${lingueeRequestTime}`);
  LocalStorage.setItem(lingueeRequestTimeKey, lingueeRequestTime + 1);
}
/**
 * Reset linguee request times.
 */
export async function resetLingueeRequestTime() {
  LocalStorage.setItem(lingueeRequestTimeKey, 0);
}
