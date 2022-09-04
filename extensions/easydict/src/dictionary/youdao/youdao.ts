/*
 * @author: tisfeng
 * @createTime: 2022-06-26 11:13
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-04 10:01
 * @fileName: youdao.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import axios, { AxiosError } from "axios";
import CryptoJS from "crypto-js";
import querystring from "node:querystring";
import qs from "qs";
import util from "util";
import { downloadAudio, downloadWordAudioWithURL, getWordAudioPath, playWordAudio } from "../../audio";
import { requestCostTime } from "../../axiosConfig";
import { userAgent, YoudaoErrorCode } from "../../consts";
import { KeyStore } from "../../preferences";
import { DicionaryType, QueryType, QueryTypeResult, RequestErrorInfo, TranslationType } from "../../types";
import { getTypeErrorInfo } from "../../utils";
import { formateYoudaoWebDictionaryModel, formatYoudaoDictionaryResult } from "./formatData";
import { QueryWordInfo, YoudaoDictionaryResult, YoudaoWebDictionaryModel, YoudaoWebTranslateResult } from "./types";
import { getYoudaoWebDictionaryLanguageId, isValidYoudaoWebTranslateLanguage } from "./utils";

/**
 * Max length of text to download youdao tts audio
 */
export const maxTextLengthOfDownloadYoudaoTTSAudio = 40;

const youdaoTranslatURL = "https://fanyi.youdao.com";

let youdaoCookie =
  "OUTFOX_SEARCH_USER_ID=362474716@10.108.162.139; Domain=.youdao.com; Expires=Sat, 17-Aug-2052 15:39:50 GMT";

/**
 * Get youdao cookie from youdao web.
 */
axios.get(youdaoTranslatURL).then((response) => {
  if (response.headers["set-cookie"]) {
    youdaoCookie = response.headers["set-cookie"]?.join(";");
    // console.warn(`youdaoCookie: ${youdaoCookie}`);
  }
});

/**
 * Youdao translate, use official API. Cost time: 0.2s
 *
 * * Note: max length of text to translate must <= 1000, otherwise, will get error: "103	翻译文本过长"
 *
 * 有道（词典）翻译 https://ai.youdao.com/DOCSIRMA/html/自然语言翻译/API文档/文本翻译服务/文本翻译服务-API文档.html
 */
export function requestYoudaoApiDictionaryTranslate(
  queryWordInfo: QueryWordInfo,
  queryType?: QueryType
): Promise<QueryTypeResult> {
  console.log(`---> start request Youdao api dictionary`);

  const type = queryType ?? DicionaryType.Youdao;

  const { fromLanguage, toLanguage, word } = queryWordInfo;
  function truncate(q: string): string {
    const len = q.length;
    return len <= 20 ? q : q.substring(0, 10) + len + q.substring(len - 10, len);
  }
  const timestamp = Math.round(new Date().getTime() / 1000);
  const salt = timestamp;
  const youdaoAppId = KeyStore.youdaoAppId;
  const sha256Content = youdaoAppId + truncate(word) + salt + timestamp + KeyStore.youdaoAppSecret;
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

        // use Youdao dictionary check if query text is a word.
        queryWordInfo.isWord = youdaoResult.isWord;

        const youdaoTypeResult: QueryTypeResult = {
          type: type,
          result: youdaoFormatResult,
          wordInfo: youdaoFormatResult.queryWordInfo,
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

  const type = queryType ?? DicionaryType.Youdao;

  // * Note: "fanyi" only works when responese dicts has only one item ["meta"]
  const dicts = [["web_trans", "ec", "ce", "baike"]];

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
  console.log(`---> youdao web dict queryString: ${queryString}`);

  const dictUrl = `https://dict.youdao.com/jsonapi?${queryString}`;
  console.log(`dictUrl: ${dictUrl}`);

  return new Promise((resolve, reject) => {
    axios
      .get(dictUrl)
      .then((res) => {
        console.log(`---> youdao web dict data: ${util.inspect(res.data, { depth: null })}`);
        console.warn(`---> youdao web dict cost: ${res.headers[requestCostTime]} ms`);

        const youdaoWebModel = res.data as YoudaoWebDictionaryModel;
        const youdaoFormatResult = formateYoudaoWebDictionaryModel(youdaoWebModel);
        const isValidResult = youdaoWebModel.input === queryWordInfo.word;
        if (!isValidResult) {
          console.warn(`---> invalid result : ${util.inspect(youdaoWebModel.meta, { depth: null })}`);
        }

        if (!youdaoFormatResult || !isValidResult) {
          const youdaoTypeResult: QueryTypeResult = {
            type: type,
            result: undefined,
            wordInfo: queryWordInfo,
            translations: [],
          };
          return resolve(youdaoTypeResult);
        }

        // use Youdao dictionary check if query text is a word.
        queryWordInfo.isWord = youdaoFormatResult.queryWordInfo.isWord;

        const youdaoTypeResult: QueryTypeResult = {
          type: type,
          result: youdaoFormatResult,
          wordInfo: youdaoFormatResult.queryWordInfo,
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
export function requestYoudaoWebTranslate(
  queryWordInfo: QueryWordInfo,
  queryType?: QueryType
): Promise<QueryTypeResult> {
  console.log(`---> start requestYoudaoWebTranslate: ${queryWordInfo.word}`);

  const type = queryType ?? TranslationType.Youdao;
  const isValidLanguage = isValidYoudaoWebTranslateLanguage(queryWordInfo);
  if (!isValidLanguage) {
    console.warn(
      `---> invalid Youdao web translate language: ${queryWordInfo.fromLanguage} --> ${queryWordInfo.toLanguage}`
    );
    const nullResult: QueryTypeResult = {
      type: type,
      result: undefined,
      wordInfo: queryWordInfo,
      translations: [],
    };
    return Promise.resolve(nullResult);
  }

  const { fromLanguage, toLanguage, word } = queryWordInfo;

  const timestamp = new Date().getTime();
  const lts = timestamp.toString(); // 1661435375537
  const salt = timestamp.toString() + Math.round(Math.random() * 10); // 16614353755371
  const bv = CryptoJS.MD5(userAgent).toString();
  const sign = CryptoJS.MD5("fanyideskweb" + word + salt + "Ygy_4c=r#e#4EX^NUGUc5").toString();

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
        // console.log(`---> youdao web translate res: ${util.inspect(response.data, { depth: null })}`);
        const youdaoWebResult = response.data as YoudaoWebTranslateResult;
        if (youdaoWebResult.errorCode === 0) {
          const translations = youdaoWebResult.translateResult.map((items) => items.map((item) => item.tgt).join(" "));
          console.log(`youdao web translations: ${translations}, cost: ${response.headers[requestCostTime]} ms`);
          const youdaoTypeResult: QueryTypeResult = {
            type: type,
            result: youdaoWebResult,
            wordInfo: queryWordInfo,
            translations: translations,
          };
          resolve(youdaoTypeResult);
        } else {
          const errorInfo: RequestErrorInfo = {
            type: type,
            code: youdaoWebResult.errorCode.toString(),
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

        console.log(`---> youdao translate error: ${error}`);
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
    type: DicionaryType.Youdao,
    code: errorCode,
    message: errorMessage,
  };
  return errorInfo;
}

/**
 * Download query word audio and play after download.
 */
export function playYoudaoWordAudioAfterDownloading(queryWordInfo: QueryWordInfo) {
  tryDownloadYoudaoAudio(queryWordInfo, () => {
    playWordAudio(queryWordInfo.word, queryWordInfo.fromLanguage);
  });
}

/**
 * Download word audio file.
 *  If query text is a word (only English word?), download audio file from youdao web api, otherwise downloaded from youdao tts.
 *
 * * NOTE: If query text is too long(>40), don't download audio file, later derectly use say command to play.
 */
export function tryDownloadYoudaoAudio(queryWordInfo: QueryWordInfo, callback?: () => void, forceDownload = false) {
  if (queryWordInfo.speechUrl) {
    downloadWordAudioWithURL(queryWordInfo.word, queryWordInfo.speechUrl, callback, forceDownload);
  } else if (queryWordInfo.isWord && queryWordInfo.fromLanguage === "en") {
    downloadYoudaoEnglishWordAudio(queryWordInfo.word, callback, (forceDownload = false));
  } else {
    console.log(`text is too long, use say command to play derectly`);
    callback && callback();
  }
}

/**
 * * Note: this function is only used to download `isWord` audio file from web youdao, if not a word, the pronunciation audio is not accurate.
 *
 * This is a wild web API from https://cloud.tencent.com/developer/article/1596467 , also can find in web https://dict.youdao.com/w/good
 *
 * Example: https://dict.youdao.com/dictvoice?type=0&audio=good
 */
export function downloadYoudaoEnglishWordAudio(word: string, callback?: () => void, forceDownload = false) {
  const url = `https://dict.youdao.com/dictvoice?type=0&audio=${encodeURIComponent(word)}`;
  console.log(`download youdao English word audio: ${word}`);
  const audioPath = getWordAudioPath(word);
  downloadAudio(url, audioPath, callback, forceDownload);
}
