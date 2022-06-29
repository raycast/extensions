import axios from "axios";
import CryptoJS from "crypto-js";
import querystring from "node:querystring";
import {
  defaultBaiduAppId,
  defaultBaiduAppSecret,
  defaultCaiyunToken,
  defaultTencentSecretId,
  defaultTencentSecretKey,
  defaultYoudaoAppId,
  defaultYoudaoAppSecret,
  getLanguageItemFromLanguageId,
  myPreferences,
} from "./utils";
import * as tencentcloud from "tencentcloud-sdk-nodejs-tmt";
import { LanguageDetectResponse } from "tencentcloud-sdk-nodejs-tmt/tencentcloud/services/tmt/v20180321/tmt_models";
import { TencentTranslateResult, TranslateTypeResult } from "./types";
import { TranslateType } from "./consts";

// youdao appid and appsecret
const youdaoAppId = myPreferences.youdaoAppId.trim().length > 0 ? myPreferences.youdaoAppId.trim() : defaultYoudaoAppId;
const youdaoAppSecret =
  myPreferences.youdaoAppSecret.trim().length > 0 ? myPreferences.youdaoAppSecret.trim() : defaultYoudaoAppSecret;

// baidu app id and secret
const baiduAppId = myPreferences.baiduAppId.trim().length > 0 ? myPreferences.baiduAppId.trim() : defaultBaiduAppId;
const baiduAppSecret =
  myPreferences.baiduAppSecret.trim().length > 0 ? myPreferences.baiduAppSecret.trim() : defaultBaiduAppSecret;

// tencent secret id and key
const tencentSecretId =
  myPreferences.tencentSecretId.trim().length > 0 ? myPreferences.tencentSecretId.trim() : defaultTencentSecretId;
const tencentSecretKey =
  myPreferences.tencentSecretKey.trim().length > 0 ? myPreferences.tencentSecretKey.trim() : defaultTencentSecretKey;

const caiyunToken = myPreferences.caiyunToken.trim().length > 0 ? myPreferences.caiyunToken.trim() : defaultCaiyunToken;

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

// 腾讯语种识别，5次/秒
export function tencentLanguageDetect(text: string): Promise<LanguageDetectResponse> {
  const params = {
    Text: text,
    ProjectId: tencentProjectId,
  };
  return client.LanguageDetect(params);
}

// 腾讯文本翻译，5次/秒  https://console.cloud.tencent.com/api/explorer?Product=tmt&Version=2018-03-21&Action=TextTranslate&SignVersion=
export function requestTencentTextTranslate(
  queryText: string,
  fromLanguage: string,
  targetLanguage: string
): Promise<TranslateTypeResult> {
  const from = getLanguageItemFromLanguageId(fromLanguage).tencentLanguageId || "auto";
  const to = getLanguageItemFromLanguageId(targetLanguage).tencentLanguageId;
  if (!to) {
    return Promise.reject(new Error("Target language is not supported by Tencent Translate"));
  }
  const params = {
    SourceText: queryText,
    Source: from,
    Target: to,
    ProjectId: tencentProjectId,
  };
  return new Promise((resolve, reject) => {
    client.TextTranslate(params, (err, response) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          type: TranslateType.Tencent,
          result: response as TencentTranslateResult,
        });
      }
    });
  });
}

// API Document https://ai.youdao.com/DOCSIRMA/html/自然语言翻译/API文档/文本翻译服务/文本翻译服务-API文档.html
export function requestYoudaoDictionary(
  queryText: string,
  fromLanguage: string,
  targetLanguage: string
): Promise<TranslateTypeResult> {
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

  return new Promise((resolve) => {
    axios.post(url, params).then((response) => {
      resolve({
        type: TranslateType.Youdao,
        result: response.data,
      });
    });
  });
}

// 百度翻译API https://fanyi-api.baidu.com/doc/21
export function requestBaiduTextTranslate(
  queryText: string,
  fromLanguage: string,
  targetLanguage: string
): Promise<TranslateTypeResult> {
  const salt = Math.round(new Date().getTime() / 1000);
  const md5Content = baiduAppId + queryText + salt + baiduAppSecret;
  const sign = CryptoJS.MD5(md5Content).toString();
  const url = "https://fanyi-api.baidu.com/api/trans/vip/translate";
  const from = getLanguageItemFromLanguageId(fromLanguage).baiduLanguageId;
  const to = getLanguageItemFromLanguageId(targetLanguage).baiduLanguageId;
  const encodeQueryText = Buffer.from(queryText, "utf8").toString();
  const params = {
    q: encodeQueryText,
    from: from,
    to: to,
    appid: baiduAppId,
    salt: salt,
    sign: sign,
  };

  return new Promise((resolve) => {
    axios.get(url, { params }).then((response) => {
      resolve({
        type: TranslateType.Baidu,
        result: response.data,
      });
    });
  });
}

// 彩云小译 https://docs.caiyunapp.com/blog/2018/09/03/lingocloud-api/#python-%E8%B0%83%E7%94%A8
export function requestCaiyunTextTranslate(
  queryText: string,
  fromLanguage: string,
  targetLanguage: string
): Promise<TranslateTypeResult> {
  const url = "https://api.interpreter.caiyunai.com/v1/translator";
  const from = getLanguageItemFromLanguageId(fromLanguage).caiyunLanguageId || "auto";
  const to = getLanguageItemFromLanguageId(targetLanguage).caiyunLanguageId;
  const trans_type = `${from}2${to}`; // "auto2xx";
  console.log("caiyun trans_type: ", trans_type);

  // Note that Caiyun Xiaoyi only supports these types of translation at present.
  const supportedTranslatType = ["zh2en", "zh2ja", "en2zh", "ja2zh"];
  if (!supportedTranslatType.includes(trans_type)) {
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

  return new Promise((resolve) => {
    axios
      .post(url, params, headers)
      .then((response) => {
        resolve({
          type: TranslateType.Caiyun,
          result: response.data,
        });
      })
      .catch((error) => {
        resolve({
          type: TranslateType.Caiyun,
          result: null,
          errorInfo: {
            errorCode: error.response.status,
            errorMessage: error.response.statusText,
          },
        });
        console.error("response: ", error.response);
      });
  });
}
