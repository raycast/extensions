/*
 * @author: tisfeng
 * @createTime: 2022-07-22 23:27
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-07-27 22:05
 * @fileName: google.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import axios, { AxiosError, AxiosResponse } from "axios";
import querystring from "node:querystring";
import { checkIfPreferredLanguagesContainedChinese } from "./detectLanguage";
import { RequestErrorInfo, RequestTypeResult, TranslationType } from "./types";
import { getLanguageItemFromYoudaoId } from "./utils";

export async function requestGoogleTranslate(
  queryText: string,
  fromLanguage: string,
  targetLanguage: string
): Promise<RequestTypeResult> {
  console.warn(`---> request google`);
  // if has preferred Chinese language or ip in China, use cn, else use com.
  let tld = "com"; // cn,com
  if (checkIfPreferredLanguagesContainedChinese() || (await checkIfIpInChina())) {
    tld = "cn";
  }
  return googleCrawlerTranslate(queryText, fromLanguage, targetLanguage, tld);
}

/**
 *  Check if ip is in China
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
 * Get current ip info
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
    console.warn(`---> ip info: ${JSON.stringify(res.data, null, 4)}, cost ${res.headers["x-request-cost"]} ms`);
    return Promise.resolve(res.data);
  } catch (error) {
    console.error(`getCurrentIp error: ${error}`);
    return Promise.reject(error);
  }
}

/**
 * Use crawler to get Google Translate results.
 *
 * From https://github.com/roojay520/bobplugin-google-translate/blob/master/src/google-translate-mobile.ts
 */
async function googleCrawlerTranslate(
  queryText: string,
  fromLanguage: string,
  targetLanguage: string,
  tld = "cn"
): Promise<RequestTypeResult> {
  const fromLanguageItem = getLanguageItemFromYoudaoId(fromLanguage);
  const toLanguageItem = getLanguageItemFromYoudaoId(targetLanguage);
  const fromLanguageId = fromLanguageItem.googleLanguageId || fromLanguageItem.youdaoLanguageId;
  const toLanguageId = toLanguageItem.googleLanguageId || toLanguageItem.youdaoLanguageId;
  const data = {
    sl: fromLanguageId, // source language
    tl: toLanguageId, // target language
    hl: toLanguageId, // hope language? web ui language
    q: queryText,
  };

  const url = `https://translate.google.${tld}/m?${querystring.stringify(data)}`;
  console.log(`---> google url: ${url}`); // https://translate.google.cn/m?sl=auto&tl=zh-CN&hl=zh-CN&q=good
  const errorInfo: RequestErrorInfo = {
    type: TranslationType.Google,
    message: "Google translate error",
  };

  return axios
    .get(url)
    .then((res: AxiosResponse) => {
      try {
        const resultRegex = /<div[^>]*?class="result-container"[^>]*>[\s\S]*?<\/div>/gi;
        let result = resultRegex.exec(res.data)?.[0]?.replace(/(<\/?[^>]+>)/gi, "") ?? "";
        result = decodeURI(result);
        console.warn(`---> google result: ${result}, cost: ${res.headers["x-request-cost"]}ms`);
        return Promise.resolve({
          type: TranslationType.Google,
          result,
        });
      } catch (error) {
        console.error(`googleTranslate error: ${error}`);
        return Promise.reject(errorInfo);
      }
    })
    .catch((err: AxiosError) => {
      console.error(`googleTranslate error: ${err}`);
      return Promise.reject(errorInfo);
    });
}

/**
 * Get current ip address
 */
export async function getCurrentIp(): Promise<string> {
  const url = "http://icanhazip.com/"; // from https://blog.csdn.net/uikoo9/article/details/113820051
  try {
    const res = await axios.get(url);
    const ip = res.data.trim();
    console.warn(`---> current ip: ${ip}, cost ${res.headers["x-request-cost"]} ms`);
    return Promise.resolve(ip);
  } catch (error) {
    console.error(`getCurrentIp error: ${error}`);
    return Promise.reject(error);
  }
}
