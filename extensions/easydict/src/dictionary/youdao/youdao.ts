/*
 * @author: tisfeng
 * @createTime: 2022-06-26 11:13
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-23 10:51
 * @fileName: youdao.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import axios, { AxiosError } from "axios";
import CryptoJS from "crypto-js";
import querystring from "node:querystring";
import util from "util";
import { downloadAudio, downloadWordAudioWithURL, getWordAudioPath, playWordAudio } from "../../audio";
import { requestCostTime } from "../../axiosConfig";
import { YoudaoErrorCode } from "../../consts";
import { KeyStore } from "../../preferences";
import { DicionaryType, QueryTypeResult, RequestErrorInfo, TranslationType } from "../../types";
import { getTypeErrorInfo } from "../../utils";
import { formatYoudaoDictionaryResult } from "./formatData";
import { QueryWordInfo, YoudaoDictionaryResult } from "./types";

/**
 * Max length of text to download youdao tts audio
 */
export const maxTextLengthOfDownloadYoudaoTTSAudio = 40;

/**
 * Youdao translate, use official API. Cost time: 0.2s
 *
 * * Note: max length of text to translate must <= 1000, otherwise, will get error: "103	翻译文本过长"
 *
 * 有道翻译 https://ai.youdao.com/DOCSIRMA/html/自然语言翻译/API文档/文本翻译服务/文本翻译服务-API文档.html
 */
export function requestYoudaoDictionary(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  console.log(`---> start request Youdao`);
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
          type: TranslationType.Youdao,
          result: youdaoFormatResult,
          wordInfo: youdaoFormatResult.queryWordInfo,
          errorInfo: errorInfo,
          translations: youdaoFormatResult.translations,
        };
        console.warn(`---> Youdao translate cost: ${response.headers[requestCostTime]} ms`);
        resolve(youdaoTypeResult);
      })
      .catch((error: AxiosError) => {
        if (error.message === "canceled") {
          console.log(`---> youdao canceled`);
          return;
        }

        console.error(`---> Youdao translate error: ${error}`);

        // It seems that Youdao will never reject, always resolve...
        // ? Error: write EPROTO 6180696064:error:1425F102:SSL routines:ssl_choose_client_version:unsupported protocol:../deps/openssl/openssl/ssl/statem/statem_lib.c:1994:

        const errorInfo = getTypeErrorInfo(DicionaryType.Youdao, error);
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

 * * NOTE: If query text is too long(>40), don't download audio file, later derectly use say command to play.
 */
export function tryDownloadYoudaoAudio(queryWordInfo: QueryWordInfo, callback?: () => void, forceDownload = false) {
  if (queryWordInfo.isWord && queryWordInfo.fromLanguage === "en") {
    downloadYoudaoEnglishWordAudio(queryWordInfo.word, callback, (forceDownload = false));
  } else if (queryWordInfo.word.length < maxTextLengthOfDownloadYoudaoTTSAudio) {
    if (queryWordInfo.speechUrl) {
      downloadWordAudioWithURL(queryWordInfo.word, queryWordInfo.speechUrl, callback, forceDownload);
    } else {
      console.warn(`youdao tts url not found: ${queryWordInfo.word}`);
      callback && callback();
    }
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
  const url = `https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(word)}`;
  console.log(`download youdao English word audio: ${word}`);
  const audioPath = getWordAudioPath(word);
  downloadAudio(url, audioPath, callback, forceDownload);
}
