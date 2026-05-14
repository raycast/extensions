/*
 * @author: tisfeng
 * @createTime: 2022-08-03 10:18
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-10-17 20:33
 * @fileName: baiduAPI.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import axios, { AxiosError, AxiosRequestConfig } from "axios";
import querystring from "node:querystring";
import { requestCostTime } from "../../axiosConfig";
import { DetectedLangModel, LanguageDetectType } from "../../detectLanguage/types";
import { QueryWordInfo } from "../../dictionary/youdao/types";
import { autoDetectLanguageItem, englishLanguageItem } from "../../language/consts";
import { getBaiduLangCode, getYoudaoLangCodeFromBaiduCode, isValidLangCode } from "../../language/languages";
import { AppKeyStore } from "../../preferences";
import {
  BaiduTranslateResult,
  BaiduWebLanguageDetect,
  QueryTypeResult,
  RequestErrorInfo,
  TranslationType,
} from "../../types";
import { getTypeErrorInfo, md5 } from "../../utils";

import genBaiduWebSign from "./baiduSign";

/**
 * Check has Baidu AppId and AppKey.
 */
export function hasBaiduAppKey(): boolean {
  const baiduAppId = AppKeyStore.baiduAppId;
  const baiduAppSecret = AppKeyStore.baiduAppSecret;

  if (baiduAppId && baiduAppSecret) {
    return true;
  } else {
    return false;
  }
}

/**
 * Baidu translate. Cost time: ~0.4s
 *
 * 百度翻译 API https://fanyi-api.baidu.com/doc/21
 */
export function requestBaiduTextTranslate(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  console.log(`---> start request Baidu translate`);

  const type = TranslationType.Baidu;

  const { fromLanguage, toLanguage, word } = queryWordInfo;
  const from = getBaiduLangCode(fromLanguage);
  const to = getBaiduLangCode(toLanguage);

  if (!from || !to) {
    console.warn(`Baidu translate not support language: ${fromLanguage} to ${toLanguage}`);
    const result: QueryTypeResult = {
      type: type,
      result: undefined,
      translations: [],
      queryWordInfo: queryWordInfo,
    };
    return Promise.resolve(result);
  }

  const baiduAppId = AppKeyStore.baiduAppId;
  const baiduAppSecret = AppKeyStore.baiduAppSecret;

  const salt = Math.round(new Date().getTime() / 1000);
  const md5Content = baiduAppId + word + salt + baiduAppSecret;
  const sign = md5(md5Content);
  const url = "https://fanyi-api.baidu.com/api/trans/vip/translate";
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
          console.warn(
            `Baidu translate: ${translations}, ${baiduResult.from}, cost: ${response.headers[requestCostTime]} ms`,
          );
          const result: QueryTypeResult = {
            type: type,
            result: baiduResult,
            translations: translations,
            queryWordInfo: queryWordInfo,
          };
          resolve(result);
        } else {
          console.error(`baidu translate error: ${JSON.stringify(baiduResult)}`); //  {"error_code":"54001","error_msg":"Invalid Sign"}
          const errorInfo: RequestErrorInfo = {
            type: type,
            code: baiduResult.error_code || "",
            message: baiduResult.error_msg || "",
          };
          reject(errorInfo);
        }
      })
      .catch((error: AxiosError) => {
        if (error.message === "canceled") {
          console.log(`---> baidu translate canceled`);
          return reject(undefined);
        }

        // It seems that Baidu will never reject, always resolve...
        console.error(`---> baidu translate error: ${error}`);
        const errorInfo = getTypeErrorInfo(type, error);
        reject(errorInfo);
      });
  });
}

/**
 * Baidu language detect. Cost time: ~0.4s
 *
 * Although Baidu provides a dedicated language recognition interface, the number of supported languages is too small, so we directly use Baidu Translate's automatic language recognition instead.
 *
 * 百度语种识别 API https://fanyi-api.baidu.com/doc/24
 *
 * Incorrect examples: const -> glg ??
 */
export async function baiduLanguageDetect(text: string): Promise<DetectedLangModel> {
  console.log(`---> start request Baidu language detect`);

  const fromLanguage = autoDetectLanguageItem.baiduLangCode;
  const toLanguage = englishLanguageItem.baiduLangCode;
  if (!fromLanguage || !toLanguage) {
    console.warn(`Baidu detect language not support: ${fromLanguage}, ${toLanguage}`);
    return Promise.reject(undefined);
  }

  const queryWordInfo: QueryWordInfo = {
    fromLanguage: fromLanguage,
    toLanguage: toLanguage,
    word: text,
  };

  const type = LanguageDetectType.Baidu;

  return new Promise((resolve, reject) => {
    requestBaiduTextTranslate(queryWordInfo)
      .then((baiduTypeResult) => {
        const baiduResult = baiduTypeResult.result as BaiduTranslateResult;
        const baiduLanguageId = baiduResult.from || "";
        const youdaoLanguageId = getYoudaoLangCodeFromBaiduCode(baiduLanguageId);
        console.warn(`---> Baidu language detect: ${baiduLanguageId}, youdaoId: ${youdaoLanguageId}`);

        /**
       * Generally speaking, Baidu language auto-detection is more accurate than Tencent language recognition.
       * Baidu language recognition is inaccurate in very few cases, such as "ragazza", it should be Italian, but Baidu auto detect is en.
       * In this case, trans_result's src === dst.
       *
       * * The Baidu results seem to have changed recently...
       * {
              "src": "ragazza",
              "dst": "拉加扎"
          }
       */
        let confirmed = false;
        const transResult = baiduResult.trans_result;
        if (transResult?.length) {
          const firstTransResult = transResult[0];
          confirmed = firstTransResult.dst !== firstTransResult.src;
        }
        const detectedLanguageResult: DetectedLangModel = {
          type: type,
          sourceLangCode: baiduLanguageId,
          youdaoLangCode: youdaoLanguageId,
          confirmed: confirmed,
          result: baiduResult,
        };
        resolve(detectedLanguageResult);
      })
      .catch((error) => {
        const errorInfo = error as RequestErrorInfo | undefined;
        if (errorInfo) {
          console.error(`---> Baidu language detect error: ${JSON.stringify(error)}`);
          errorInfo.type = type; // * Note: need to set language detect type.
        }
        reject(errorInfo);
      });
  });
}

/**
 * Baidu web language detect, unofficial API. Cost time: ~0.3s
 */
export async function baiduWebDetect(text: string): Promise<DetectedLangModel> {
  console.log(`---> start web Baidu language detect`);
  const type = LanguageDetectType.Baidu;

  return new Promise((resolve, reject) => {
    const url = "https://fanyi.baidu.com/langdetect";
    const params = { query: text };
    axios
      .post(url, querystring.stringify(params))
      .then((response) => {
        // console.log(`---> web Baidu language detect response: ${JSON.stringify(response.data)}`);

        const baiduWebLanguageDetect = response.data as BaiduWebLanguageDetect;
        if (baiduWebLanguageDetect.error === 0) {
          const baiduLanguageId = baiduWebLanguageDetect.lan || "";
          const youdaoLanguageId = getYoudaoLangCodeFromBaiduCode(baiduLanguageId);
          const isConfirmed = isValidLangCode(youdaoLanguageId);

          console.warn(`---> Baidu detect cost: ${response.headers[requestCostTime]} ms`);
          console.warn(`---> Baidu detect language: ${baiduLanguageId}, youdaoId: ${youdaoLanguageId}`);

          const detectedLanguageResult: DetectedLangModel = {
            type: type,
            sourceLangCode: baiduLanguageId,
            youdaoLangCode: youdaoLanguageId,
            confirmed: isConfirmed,
            result: baiduWebLanguageDetect,
          };
          resolve(detectedLanguageResult);
        } else {
          console.error(`web Baidu detect error: ${JSON.stringify(baiduWebLanguageDetect)}`);

          const errorInfo = getBaiduWebLanguageDetectErrorInfo(baiduWebLanguageDetect);
          reject(errorInfo);
        }
      })
      .catch((error) => {
        if (error.message === "canceled") {
          console.log(`---> baidu detect canceled`);
          return reject(undefined);
        }

        console.error(`---> web Baidu language detect error: ${error}`);

        const errorInfo = getTypeErrorInfo(type, error);
        reject(errorInfo);
      });
  });
}

function getBaiduWebLanguageDetectErrorInfo(result: BaiduWebLanguageDetect): RequestErrorInfo {
  const errorCode = result.error;
  const errorInfo: RequestErrorInfo = {
    type: LanguageDetectType.Baidu,
    code: errorCode ? errorCode.toString() : "",
    message: result.msg || "",
  };

  return errorInfo;
}

export function requestBaiduWebTranslate(queryWordInfo: QueryWordInfo) {
  console.log(`---> start request Baidu web translate`);
  const { fromLanguage, toLanguage, word } = queryWordInfo;
  const from = getBaiduLangCode(fromLanguage);
  const to = getBaiduLangCode(toLanguage);

  const sign = genBaiduWebSign(word);
  console.log("genBaiduWebSign:", sign);

  const data = {
    from: from,
    to: to,
    query: word,
    transtype: "realtime",
    simple_means_flag: "3",
    sign: sign, // "262931.57378"
    token: "d29164d8e5ad8982b8bdfebb302b1d02",
    domain: "common",
  };

  const url = `https://fanyi.baidu.com/v2transapi?from=${from}&to=${to}`;
  // console.log("url:", url);
  // console.log(`data: ${JSON.stringify(data, null, 4)}`);

  const config: AxiosRequestConfig = {
    method: "post",
    url,
    headers: {
      Cookie: `BDUSS_BFESS=ZyaElxRFNualBCTDBiaUpuZThZRElJVHNXLU51Ymsyc0IwTWR6Q05QU28yOUJpRVFBQUFBJCQAAAAAAAAAAAEAAACFn5wyus3Jz7Xb1sD3u9fTMjkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKhOqWKoTqliR0; BIDUPSID=6EB71D1B4A8BC0DE40363496E6DB1F13; PSTM=1655978669; BAIDUID=6EB71D1B4A8BC0DE40363496E6DB1F13:SL=0:NR=10:FG=1; delPer=0; ZFY=AEhZxlaGqYfzFMBYtyymV:BcseeQ0ZORDMeQ:Aov9aKEs:C; H_PS_PSSID=36553_36464_36502_36455_31254_36667_36413_36691_36167_36694_36698_26350_36468_36312; BDRCVFR[feWj1Vr5u3D]=I67x6TjHwwYf0; APPGUIDE_10_0_2=1; REALTIME_TRANS_SWITCH=1; FANYI_WORD_SWITCH=1; HISTORY_SWITCH=1; SOUND_SPD_SWITCH=1; SOUND_PREFER_SWITCH=1; Hm_lvt_64ecd82404c51e03dc91cb9e8c025574=1660230940; BAIDUID_BFESS=6EB71D1B4A8BC0DE40363496E6DB1F13:SL=0:NR=10:FG=1; H_WISE_SIDS=110085_131862_189755_194529_196427_197471_204427_204906_209568_210322_211435_211986_212296_212873_213029_213349_214800_215730_216211_216942_219473_219558_219623_219723_219744_219942_219946_220017_220072_220604_220606_220662_220855_220928_221121_221318_221410_221468_221479_221502_221550_221678_221697_221874_221916_222207_222298_222396_222443_222522_222625_222887_223192_223209_223228_223374_223474_223683_223769_223789_223889_224045_224055_224099_224195_224429_224457_224573_224812_224914_224983_225245_225297_225337_225383_225661_225743_225755_225859_225917_225983_226011_226075_226218_226284_226294_226377_226388_226405_226431_226504_226509_226545_226574_226719_226757_226867_227061_227064_227066_227082_227156_227215_227367_8000081_8000105_8000126_8000140_8000149_8000154_8000171_8000177_8000179_8000186; RT="z=1&dm=baidu.com&si=s0cbuhw4hc&ss=l7pk6fr5&sl=3&tt=3js&bcn=https%3A%2F%2Ffclog.baidu.com%2Flog%2Fweirwood%3Ftype%3Dperf&ld=197e&ul=1ldt&hd=1lel"; Hm_lvt_afd111fa62852d1f37001d1f980b6800=1662567262; Hm_lpvt_afd111fa62852d1f37001d1f980b6800=1662568745; Hm_lpvt_64ecd82404c51e03dc91cb9e8c025574=1662569824`,
    },
    data: querystring.stringify(data), // if data is json object ??
    // data: data,
  };

  axios(config)
    .then(function (response) {
      console.log(`---> request Baidu web success: ${JSON.stringify(response.data, null, 4)}`);
      console.log(`baidu web cost: ${response.headers[requestCostTime]}`);
    })
    .catch(function (error) {
      console.error(`---> request Baidu web error: ${JSON.stringify(error)}`);
    });
}
