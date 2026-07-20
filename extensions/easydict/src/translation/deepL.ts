/*
 * @author: tisfeng
 * @createTime: 2022-08-03 10:18
 * @lastEditor: Tisfeng
 * @lastEditTime: 2022-10-30 23:12
 * @fileName: deepL.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import axios, { AxiosError } from "axios";
import querystring from "node:querystring";
import { httpsAgent, requestCostTime } from "../axiosConfig";
import { QueryWordInfo } from "../dictionary/youdao/types";
import { getDeepLLangCode } from "../language/languages";
import { AppKeyStore } from "../preferences";
import { DeepLTranslateResult, QueryTypeResult, RequestErrorInfo, TranslationType } from "../types";
import { getTypeErrorInfo } from "../utils";

/**
 * DeepL translate API. Cost time: > 1s
 *
 * https://www.deepl.com/zh/docs-api/translating-text
 */
export async function requestDeepLTranslate(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  console.log(`---> start request DeepL`);
  const { fromLanguage, toLanguage, word } = queryWordInfo;
  const sourceLang = getDeepLLangCode(fromLanguage);
  const targetLang = getDeepLLangCode(toLanguage);

  const deepLType = TranslationType.DeepL;

  // if language is not supported, return null
  if (!sourceLang || !targetLang) {
    console.log(`DeepL translate not support language: ${fromLanguage} --> ${toLanguage}`);
    const result: QueryTypeResult = {
      type: deepLType,
      result: undefined,
      translations: [],
      queryWordInfo: queryWordInfo,
    };
    return Promise.resolve(result);
  }

  const deepLAuthKey = AppKeyStore.deepLAuthKey;

  const errorInfo: RequestErrorInfo = {
    type: deepLType,
    code: "",
    message: "Error",
  };

  if (!deepLAuthKey) {
    errorInfo.message = "No deepL key";
    return Promise.reject(errorInfo);
  }

  // * deepL api free and deepL pro api use different url host.
  let url = deepLAuthKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

  const deepLEndpoint = AppKeyStore.deepLEndpoint;
  if (deepLEndpoint.length > 0) {
    url = deepLEndpoint;
  }

  const params = {
    text: word,
    source_lang: sourceLang,
    target_lang: targetLang,
  };
  // console.log(`---> deepL params: ${JSON.stringify(params, null, 4)}`);

  return new Promise((resolve, reject) => {
    axios
      .post(url, querystring.stringify(params), {
        httpsAgent,
        headers: {
          Authorization: `DeepL-Auth-Key ${deepLAuthKey}`,
        },
      })
      .then((response) => {
        const deepLResult = response.data as DeepLTranslateResult;
        const translatedText = deepLResult.translations[0].text;
        console.log(
          `DeepL translate: ${JSON.stringify(translatedText, null, 4)}, cost: ${response.headers[requestCostTime]} ms`,
        );

        const deepLTypeResult: QueryTypeResult = {
          type: TranslationType.DeepL,
          result: deepLResult,
          translations: translatedText.split("\n"),
          queryWordInfo: queryWordInfo,
        };
        resolve(deepLTypeResult);
      })
      .catch((error: AxiosError) => {
        if (error.message === "canceled") {
          console.log(`---> deepL canceled`);
          return reject(undefined);
        }

        console.error("deepL error: ", error);

        const errorInfo = getTypeErrorInfo(TranslationType.DeepL, error);
        const errorCode = error.response?.status;

        // https://www.deepl.com/zh/docs-api/api-access/error-handling/
        if (errorCode === 456) {
          errorInfo.message = "Quota exceeded"; // Quota exceeded. The character limit has been reached.
        } else if (errorCode === 403) {
          errorInfo.message = "Authorization failed"; // Authorization failed. Please supply a valid auth_key parameter.
        }

        console.error("deepL error info: ", errorInfo); // message: 'timeout of 15000ms exceeded'
        reject(errorInfo);
      });
  });
}
