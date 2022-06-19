import axios from "axios";
import crypto from "crypto";
import querystring from "node:querystring";
import { getLanguageItemFromList, myPreferences } from "./utils";

// concurrent request for multiple translation interfaces
export function requestAllTranslateAPI(queryText: string, fromLanguage: string, targetLanguage: string): Promise<any> {
  return axios.all([
    requestYoudaoAPI(queryText, fromLanguage, targetLanguage),
    requestBaiduAPI(queryText, fromLanguage, targetLanguage),
    requestCaiyunAPI(queryText, fromLanguage, targetLanguage),
  ]);
}

// API Document https://ai.youdao.com/DOCSIRMA/html/自然语言翻译/API文档/文本翻译服务/文本翻译服务-API文档.html
export function requestYoudaoAPI(queryText: string, fromLanguage: string, targetLanguage: string): Promise<any> {
  function truncate(q: string): string {
    const len = q.length;
    return len <= 20 ? q : q.substring(0, 10) + len + q.substring(len - 10, len);
  }

  const appId = myPreferences.youdaoAppId;
  const appSecret = myPreferences.youdaoAppSecret;

  const sha256 = crypto.createHash("sha256");
  const timestamp = Math.round(new Date().getTime() / 1000);
  const salt = timestamp;
  const sha256Content = appId + truncate(queryText) + salt + timestamp + appSecret;
  const sign = sha256.update(sha256Content).digest("hex");
  const url = "https://openapi.youdao.com/api";

  console.log("requestYoudaoAPI");

  return axios.post(
    url,
    querystring.stringify({
      sign,
      salt,
      from: fromLanguage,
      signType: "v3",
      q: queryText,
      appKey: appId,
      curtime: timestamp,
      to: targetLanguage,
    })
  );
}

export function useSymbolSegmentationArrayText(textArray: string[]): string {
  return textArray.join("；");
}

// 百度翻译API https://fanyi-api.baidu.com/doc/21
export function requestBaiduAPI(queryText: string, fromLanguage: string, targetLanguage: string): Promise<any> {
  const appId = myPreferences.baiduAppId;
  const appSecret = myPreferences.baiduAppSecret;

  const md5 = crypto.createHash("md5");
  const salt = Math.round(new Date().getTime() / 1000);
  const md5Content = appId + queryText + salt + appSecret;
  const sign = md5.update(md5Content).digest("hex");
  const apiServer = "https://fanyi-api.baidu.com/api/trans/vip/translate";

  const from = getLanguageItemFromList(fromLanguage).baiduLanguageId;
  const to = getLanguageItemFromList(targetLanguage).baiduLanguageId;

  const encodeQueryText = encodeURIComponent(queryText);

  const url = apiServer + `?q=${encodeQueryText}&from=${from}&to=${to}&appid=${appId}&salt=${salt}&sign=${sign}`;

  return axios.get(url);
}

// 彩云小译 https://docs.caiyunapp.com/blog/2018/09/03/lingocloud-api/#python-%E8%B0%83%E7%94%A8
export function requestCaiyunAPI(queryText: string, fromLanguage: string, targetLanguage: string): Promise<any> {
  const appToken = myPreferences.caiyunAppToken;

  const url = "https://api.interpreter.caiyunai.com/v1/translator";
  const from = getLanguageItemFromList(fromLanguage).caiyunLanguageId || "auto";
  const to = getLanguageItemFromList(targetLanguage).caiyunLanguageId;
  const trans_type = `${from}2${to}`; // "auto2xx";

  // Note that Caiyun Xiaoyi only supports these types of translation at present.
  const supportedTranslatType = ["zh2en", "zh2ja", "en2zh", "ja2zh"];
  if (!supportedTranslatType.includes(trans_type) || !appToken.length) {
    return Promise.resolve(null);
  }

  return axios.post(
    url,
    {
      source: queryText,
      trans_type,
      detect: from === "auto",
    },
    {
      headers: {
        "content-type": "application/json",
        "x-authorization": "token " + appToken,
      },
    }
  );
}
