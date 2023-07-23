/*
 * @author: tisfeng
 * @createTime: 2022-06-26 11:13
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-10-15 11:41
 * @fileName: youdao.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { LocalStorage } from "@raycast/api";
import axios, { AxiosError } from "axios";
import CryptoJS from "crypto-js";
import querystring from "node:querystring";
import qs from "qs";
import util from "util";
import { downloadAudio, downloadWordAudioWithURL, getWordAudioPath, playWordAudio } from "../../audio";
import { requestCostTime } from "../../axiosConfig";
import { userAgent, YoudaoErrorCode } from "../../consts";
import { autoDetectLanguageItem, englishLanguageItem } from "../../language/consts";
import { AppKeyStore, myPreferences } from "../../preferences";
import { DictionaryType, QueryType, QueryTypeResult, RequestErrorInfo, TranslationType } from "../../types";
import { getTypeErrorInfo, md5 } from "../../utils";
import {
  formatYoudaoWebDictionaryModel as formatYoudaoWebDictionaryModel,
  formatYoudaoDictionaryResult,
} from "./formatData";
import { QueryWordInfo, YoudaoDictionaryResult, YoudaoWebDictionaryModel, YoudaoWebTranslateResult } from "./types";
import { getYoudaoWebDictionaryLanguageId, isValidYoudaoWebTranslateLanguage } from "./utils";

console.log(`enter youdao.ts`);

/**
 * Max length of text to download youdao tts audio
 */
export const maxTextLengthOfDownloadYoudaoTTSAudio = 40;

const youdaoTranslatURL = "https://fanyi.youdao.com";

const youdaoCookieKey = "youdaoCookie";

let youdaoCookie: string | undefined; // "OUTFOX_SEARCH_USER_ID=362474716@10.108.162.139; Domain=.youdao.com; Expires=Sat, 17-Aug-2052 15:39:50 GMT";

// * Cookie will be expired after 1 day, so we need to update it every time we start.
if (myPreferences.enableYoudaoDictionary || myPreferences.enableYoudaoTranslate) {
  getYoudaoWebCookie();
}

/**
 * Get youdao cookie from youdao web, and store it in local storage.
 */
function getYoudaoWebCookie(): Promise<string | undefined> {
  console.log("start getYoudaoWebCookie");

  LocalStorage.getItem<string>(youdaoCookieKey).then((cookie) => {
    if (cookie) {
      youdaoCookie = cookie;
      // console.log(`---> get youdaoCookie from local storage: ${youdaoCookie}`);
    }
  });

  const headers = {
    "User-Agent": userAgent,
  };

  return new Promise((resolve) => {
    axios
      .get(youdaoTranslatURL, { headers })
      .then((response) => {
        const cookie = response.headers["set-cookie"];
        if (cookie?.length && Array.isArray(cookie)) {
          youdaoCookie = cookie.join(";");
          resolve(youdaoCookie);
          LocalStorage.setItem(youdaoCookieKey, youdaoCookie);
          console.log(`get web youdaoCookie: ${youdaoCookie}`);
          console.log(`get youdaoCookie cost time: ${response.headers[requestCostTime]} ms`);
        }
      })
      .catch((error) => {
        console.error(`get youdaoCookie error: ${error}`);
        LocalStorage.removeItem(youdaoCookieKey);
        resolve(undefined);
      });
  });
}

/**
 * Youdao translate, use official API. Cost time: 0.2s
 *
 * * Note: max length of text to translate must <= 1000, otherwise, will get error: "103	翻译文本过长"
 *
 * 有道（词典）翻译 https://ai.youdao.com/DOCSIRMA/html/自然语言翻译/API文档/文本翻译服务/文本翻译服务-API文档.html
 */
export function requestYoudaoAPITranslate(
  queryWordInfo: QueryWordInfo,
  queryType?: QueryType
): Promise<QueryTypeResult> {
  console.log(`---> start request Youdao api dictionary`);

  const type = queryType ?? DictionaryType.Youdao;

  const { fromLanguage, toLanguage, word } = queryWordInfo;
  function truncate(q: string): string {
    const len = q.length;
    return len <= 20 ? q : q.substring(0, 10) + len + q.substring(len - 10, len);
  }
  const timestamp = Math.round(new Date().getTime() / 1000);
  const salt = timestamp;
  const youdaoAppId = AppKeyStore.youdaoAppId;
  const sha256Content = youdaoAppId + truncate(word) + salt + timestamp + AppKeyStore.youdaoAppSecret;
  const sign = CryptoJS.SHA256(sha256Content).toString();
  const url = youdaoAppId ? "https://openapi.youdao.com/api" : "https://aidemo.youdao.com/trans";
  const params = querystring.stringify({
    sign,
    salt,
    from: fromLanguage,
    signType: "v3",
    q: word,
    appKey: youdaoAppId,
    curtime: timestamp,
    to: toLanguage,
  });
  // console.log(`---> youdao params: ${params}`);

  return new Promise((resolve, reject) => {
    axios
      .post(url, params)
      .then((response) => {
        const youdaoResult = response.data as YoudaoDictionaryResult;
        // console.log(`---> youdao res: ${util.inspect(youdaoResult, { depth: null })}`);

        const errorInfo = getYoudaoErrorInfo(youdaoResult.errorCode);
        const youdaoFormatResult = formatYoudaoDictionaryResult(youdaoResult);

        if (!youdaoFormatResult) {
          console.error(`---> youdao error: ${util.inspect(youdaoResult, { depth: null })}`);
          reject(errorInfo);
          return;
        }

        const youdaoTypeResult: QueryTypeResult = {
          type: type,
          result: youdaoFormatResult,
          queryWordInfo: youdaoFormatResult.queryWordInfo,
          translations: youdaoFormatResult.translation.split("\n"),
        };
        console.warn(`---> Youdao translate cost: ${response.headers[requestCostTime]} ms`);
        resolve(youdaoTypeResult);
      })
      .catch((error: AxiosError) => {
        if (error.message === "canceled") {
          console.log(`---> youdao api dict canceled`);
          return reject(undefined);
        }

        console.error(`---> Youdao translate error: ${error}`);

        // It seems that Youdao will never reject, always resolve...
        // ? Error: write EPROTO 6180696064:error:1425F102:SSL routines:ssl_choose_client_version:unsupported protocol:../deps/openssl/openssl/ssl/statem/statem_lib.c:1994:

        const errorInfo = getTypeErrorInfo(type, error);
        reject(errorInfo);
      });
  });
}

/**
 * Youdao web dictionary, unofficial API. Cost time: 0.2s
 *
 * Supported zh <--> targetLanguage, supported target language: en, fr, ja, ko
 */
export function requestYoudaoWebDictionary(
  queryWordInfo: QueryWordInfo,
  queryType?: QueryType
): Promise<QueryTypeResult> {
  console.log(`---> start requestYoudaoWebDictionary`);

  const type = queryType ?? DictionaryType.Youdao;

  // * Note: "fanyi" only works when responese dicts has only one item ["meta"]
  const dicts = [["web_trans", "ec", "ce", "newhh", "baike", "wikipedia_digest"]];

  // English --> Chinese
  // ["web_trans","video_sents", "simple", "phrs",  "syno", "collins", "word_video",  "discriminate", "ec", "ee", "blng_sents_part", "individual", "collins_primary", "rel_word", "auth_sents_part", "media_sents_part", "expand_ec", "etym", "special","baike", "meta", "senior", "webster","oxford", "oxfordAdvance", "oxfordAdvanceHtml"]

  // Chinese --> English
  // ["web_trans", "blng_sents_part", "ce", "wuguanghua", "ce_new", "simple", "media_sents_part", "special", "baike", "meta", "newhh"]

  const queryYoudaoDictLanguageId = getYoudaoWebDictionaryLanguageId(queryWordInfo);
  if (!queryYoudaoDictLanguageId) {
    console.error(`Youdao dict not supported language: ${queryWordInfo.fromLanguage} --> ${queryWordInfo.toLanguage}`);
    const errorInfo: RequestErrorInfo = {
      type: type,
      code: "",
      message: "not supported language 😭",
    };
    return Promise.reject(errorInfo);
  }

  const params = {
    q: queryWordInfo.word,
    le: queryYoudaoDictLanguageId,
    dicts: JSON.stringify({ count: 99, dicts: dicts }),
  };

  const queryString = qs.stringify(params);
  // console.log(`---> youdao web dict queryString: ${queryString}`);

  const dictUrl = `https://dict.youdao.com/jsonapi?${queryString}`;
  // console.log(`dictUrl: ${dictUrl}`);

  return new Promise((resolve, reject) => {
    axios
      .get(dictUrl)
      .then((res) => {
        console.log(`---> youdao web dict data: ${util.inspect(res.data, { depth: null })}`);
        console.warn(`---> youdao web dict cost: ${res.headers[requestCostTime]} ms`);

        const youdaoWebModel = res.data as YoudaoWebDictionaryModel;
        const youdaoFormatResult = formatYoudaoWebDictionaryModel(youdaoWebModel);
        const youdaoQueryWordInfo = youdaoFormatResult.queryWordInfo;

        if (!youdaoQueryWordInfo.hasDictionaryEntries) {
          const youdaoTypeResult: QueryTypeResult = {
            type: type,
            result: undefined,
            queryWordInfo: queryWordInfo,
            translations: [],
          };
          return resolve(youdaoTypeResult);
        }

        // * Note: Youdao web dict from-to language may be incorrect, eg: 鶗鴂, so we need to update it.
        if (queryWordInfo.fromLanguage !== autoDetectLanguageItem.youdaoLangCode) {
          youdaoQueryWordInfo.fromLanguage = queryWordInfo.fromLanguage;
          youdaoQueryWordInfo.toLanguage = queryWordInfo.toLanguage;
        }

        const youdaoTypeResult: QueryTypeResult = {
          type: type,
          result: youdaoFormatResult,
          queryWordInfo: youdaoQueryWordInfo,
          translations: youdaoFormatResult.translation.split("\n"),
        };
        resolve(youdaoTypeResult);
      })
      .catch((error: AxiosError) => {
        if (error.message === "canceled") {
          console.log(`---> youdao web dict canceled`);
          return reject(undefined);
        }

        console.error(`---> Youdao web dict error: ${error}`);

        // It seems that Youdao will never reject, always resolve...
        // ? Error: write EPROTO 6180696064:error:1425F102:SSL routines:ssl_choose_client_version:unsupported protocol:../deps/openssl/openssl/ssl/statem/statem_lib.c:1994:

        const errorInfo = getTypeErrorInfo(type, error);
        reject(errorInfo);
      });
  });
}

/**
 * Youdao translate, unofficial web API. Cost time: 0.2s
 *
 * Ref: https://mp.weixin.qq.com/s/AWL3et91N8T24cKs1v660g
 */
export async function requestYoudaoWebTranslate(
  queryWordInfo: QueryWordInfo,
  queryType?: QueryType
): Promise<QueryTypeResult> {
  console.log(`---> start requestYoudaoWebTranslate: ${queryWordInfo.word}`);
  const { fromLanguage, toLanguage, word } = queryWordInfo;

  const type = queryType ?? TranslationType.Youdao;
  const isValidLanguage = isValidYoudaoWebTranslateLanguage(queryWordInfo);

  if (!youdaoCookie) {
    console.log(`no stored Youdao cookie`);
    youdaoCookie = await getYoudaoWebCookie();
  }
  // console.log(`youdaoCookie: ${youdaoCookie}`);

  if (!isValidLanguage || !youdaoCookie) {
    if (!youdaoCookie) {
      console.error(`---> Youdao web translate error: no cookie`);
    }
    if (!isValidLanguage) {
      console.warn(`---> invalid Youdao web translate language: ${fromLanguage} --> ${toLanguage}`);
    }
    const undefinedResult: QueryTypeResult = {
      type: type,
      result: undefined,
      queryWordInfo: queryWordInfo,
      translations: [],
    };
    return Promise.resolve(undefinedResult);
  }

  const timestamp = new Date().getTime();
  const lts = timestamp.toString(); // 1661435375537
  const salt = lts + Math.round(Math.random() * 10); // 16614353755371
  const bv = md5(userAgent);
  const sign = md5("fanyideskweb" + word + salt + "Ygy_4c=r#e#4EX^NUGUc5");

  const url = `${youdaoTranslatURL}/translate_o?smartresult=dict&smartresult=rule`;
  const data = {
    salt,
    sign,
    lts,
    bv,
    i: word,
    from: fromLanguage,
    to: toLanguage,
    smartresult: "dict",
    client: "fanyideskweb",
    doctype: "json",
    version: "2.1",
    keyfrom: "fanyi.web",
    action: "FY_BY_REALTlME",
  };
  // console.log(`---> youdao web translate params: ${util.inspect(data, { depth: null })}`);

  const headers = {
    "User-Agent": userAgent,
    Referer: youdaoTranslatURL,
    Cookie: youdaoCookie,
  };

  return new Promise((resolve, reject) => {
    axios
      .post(url, querystring.stringify(data), { headers })
      .then((response) => {
        console.log(`---> youdao web translate res: ${util.inspect(response.data, { depth: null })}`);
        const youdaoWebResult = response.data as YoudaoWebTranslateResult;
        if (youdaoWebResult.errorCode === 0) {
          const translations = youdaoWebResult.translateResult.map((items) => items.map((item) => item.tgt).join(" "));
          console.log(`youdao web translations: ${translations}, cost: ${response.headers[requestCostTime]} ms`);
          const youdaoTypeResult: QueryTypeResult = {
            type: type,
            result: youdaoWebResult,
            queryWordInfo: queryWordInfo,
            translations: translations,
          };
          resolve(youdaoTypeResult);
        } else {
          console.error(`---> youdao web translate error: ${util.inspect(youdaoWebResult, { depth: null })}`);
          const errorInfo: RequestErrorInfo = {
            type: type,
            code: youdaoWebResult.errorCode?.toString(),
            message: "",
          };
          reject(errorInfo);
        }
      })
      .catch((error) => {
        if (error.message === "canceled") {
          console.log(`---> youdao web translate canceled`);
          return reject(undefined);
        }

        console.log(`---> youdao web translate error: ${JSON.stringify(error, null, 4)}`);
        const errorInfo = getTypeErrorInfo(type, error);
        reject(errorInfo);
      });
  });
}

function getYoudaoErrorInfo(errorCode: string): RequestErrorInfo {
  let errorMessage = "";
  switch (errorCode) {
    case YoudaoErrorCode.Success: {
      errorMessage = "Success";
      break;
    }
    case YoudaoErrorCode.TargetLanguageNotSupported: {
      errorMessage = "Target language not supported";
      break;
    }
    case YoudaoErrorCode.TranslatedTextTooLong: {
      errorMessage = "Translated text too long";
      break;
    }
    case YoudaoErrorCode.InvalidApplicationID: {
      errorMessage = "Invalid application ID";
      break;
    }
    case YoudaoErrorCode.InvalidSignature: {
      errorMessage = "Invalid signature";
      break;
    }
    case YoudaoErrorCode.AccessFrequencyLimited: {
      errorMessage = "Access frequency limited";
      break;
    }
    case YoudaoErrorCode.TranslationQueryFailed: {
      errorMessage = "Translation query failed";
      break;
    }
    case YoudaoErrorCode.InsufficientAccountBalance: {
      errorMessage = "Insufficient account balance";
      break;
    }
  }

  const errorInfo: RequestErrorInfo = {
    type: DictionaryType.Youdao,
    code: errorCode,
    message: errorMessage,
  };
  return errorInfo;
}

/**
 * Download query word audio and play after download.
 */
export function playYoudaoWordAudioAfterDownloading(queryWordInfo: QueryWordInfo, enableYoudaoWebAudio = true) {
  downloadYoudaoAudio(queryWordInfo, enableYoudaoWebAudio, () => {
    playWordAudio(queryWordInfo.word, queryWordInfo.fromLanguage);
  });
}

/**
 * Download word audio file.
 *
 * If query text is a English word, download audio file from youdao web api, otherwise downloaded from youdao tts.
 *
 * * If query text is too long(>40), don't download audio file, later derectly use say command to play.
 */
export function downloadYoudaoAudio(
  queryWordInfo: QueryWordInfo,
  enableYoudaoWebAudio = true,
  callback?: () => void,
  forceDownload = false
) {
  // For most English words, it seems that Youdao web audio is better than Youdao tts, but not all words have web audio.
  if (queryWordInfo.speechUrl) {
    downloadWordAudioWithURL(queryWordInfo.word, queryWordInfo.speechUrl, callback, forceDownload);
  } else if (
    enableYoudaoWebAudio &&
    queryWordInfo.isWord &&
    queryWordInfo.fromLanguage === englishLanguageItem.youdaoLangCode
  ) {
    downloadYoudaoEnglishWordAudio(queryWordInfo.word, callback, (forceDownload = false));
  } else {
    console.log(`use say command to play derectly`);
    callback && callback();
  }
}

/**
 * * Note: this function is only used to download `isWord` audio file from web youdao, if not a word, the pronunciation audio is not accurate.
 *
 * This is a wild web API from https://cloud.tencent.com/developer/article/1596467 , also can find in web https://dict.youdao.com/w/good
 *
 * Example: https://dict.youdao.com/dictvoice?audio=good&type=2
 *
 * type: 1: uk, 2: us. ---> 0: us ?
 *
 * * NOTE: Audio 'Volcano' is different from 'volcano' in youdao web audio, so odd, so we use lower case word.
 *
 * * Note: some of words, both uppercase and lowercase, have the same audio url, eg: polaris and Polaris: https://dict.youdao.com/dictvoice?type=2&audio=Polaris
 */
export function downloadYoudaoEnglishWordAudio(word: string, callback?: () => void, forceDownload = false) {
  const url = `https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(word)}`;
  console.log(`download web youdao 'English' word audio: ${word}`);
  const audioPath = getWordAudioPath(word);
  downloadAudio(url, audioPath, callback, forceDownload);
}
