/*
 * @author: tisfeng
 * @createTime: 2022-07-22 23:27
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-07-24 16:22
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
<body>
    <div class="root-container">
        <div class="header">
            <div class="logo-image"></div>
            <div class="logo-text">翻译</div>
        </div>
        <div class="languages-container">
            <div class="sl-and-tl"><a href="./m?sl=auto&amp;tl=zh-CN&amp;q=good&amp;mui=sl&amp;hl=zh-CN">检测语言</a> → <a
                    href="./m?sl=auto&amp;tl=zh-CN&amp;q=good&amp;mui=tl&amp;hl=zh-CN">中文（简体）</a></div>
        </div>
        <div class="input-container">
            <form action="/m"><input type="hidden" name="sl" value="auto"><input type="hidden" name="tl"
                    value="zh-CN"><input type="hidden" name="hl" value="zh-CN"><input type="text" aria-label="原文"
                    name="q" class="input-field" maxlength="2048" value="good">
                <div class="translate-button-container"><input type="submit" value="翻译" class="translate-button"></div>
            </form>
        </div>
        <div class="result-container">好的</div>
        <div class="links-container">
            <ul>
                <li><a href="https://www.google.com/m?hl=zh-CN">Google 主页</a></li>
                <li><a href="https://www.google.com/tools/feedback/survey/xhtml?productId=95112&hl=zh-CN">发送反馈</a></li>
                <li><a href="https://www.google.com/intl/zh-CN/policies">隐私权及使用条款</a></li>
                <li><a href="./full">切换为完整网站</a></li>
            </ul>
        </div>
    </div>
</body>
*/

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
