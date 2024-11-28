/*
 * @author: tisfeng
 * @createTime: 2022-08-03 10:19
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-27 16:40
 * @fileName: caiyun.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import axios, { AxiosError } from "axios";
import { requestCostTime } from "../axiosConfig";
import { QueryWordInfo } from "../dictionary/youdao/types";
import { getCaiyunLangCode } from "../language/languages";
import { AppKeyStore } from "../preferences";
import { CaiyunTranslateResult, QueryTypeResult, TranslationType } from "../types";
import { getTypeErrorInfo } from "../utils";

/**
 * Caiyun translate API. Cost time: 0.2s
 *
 * 彩云小译  https://open.caiyunapp.com/%E4%BA%94%E5%88%86%E9%92%9F%E5%AD%A6%E4%BC%9A%E5%BD%A9%E4%BA%91%E5%B0%8F%E8%AF%91_API
 */
export function requestCaiyunTextTranslate(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  console.log(`---> start request Caiyun`);
  const { fromLanguage, toLanguage, word } = queryWordInfo;

  const url = "https://api.interpreter.caiyunai.com/v1/translator";
  const from = getCaiyunLangCode(fromLanguage);
  const to = getCaiyunLangCode(toLanguage);
  const trans_type = `${from}2${to}`; // "auto2xx";

  const type = TranslationType.Caiyun;

  // Note that Caiyun Translate only supports these types of translation at present.
  const supportedTranslatType = ["zh2en", "zh2ja", "en2zh", "ja2zh"];
  if (!supportedTranslatType.includes(trans_type)) {
    console.log(`Caiyun translate not support language: ${fromLanguage} --> ${toLanguage}`);
    const result: QueryTypeResult = {
      type: type,
      result: undefined,
      translations: [],
      queryWordInfo: queryWordInfo,
    };
    return Promise.resolve(result);
  }
  const params = {
    source: word.split("\n"), // source can be text or array. if source is an array, it will be translated in parallel
    trans_type,
    detect: from === "auto",
  };
  // console.log(`---> Caiyun params: ${JSON.stringify(params, null, 4)}`);
  const config = {
    headers: {
      "content-type": "application/json",
      "x-authorization": "token " + AppKeyStore.caiyunToken,
    },
  };

  return new Promise((resolve, reject) => {
    axios
      .post(url, params, config)
      .then((response) => {
        const caiyunResult = response.data as CaiyunTranslateResult;
        const translations = caiyunResult.target;
        console.log(`Caiyun translate: ${translations}, cost: ${response.headers[requestCostTime]} ms`);
        resolve({
          type: type,
          result: caiyunResult,
          translations: translations,
          queryWordInfo: queryWordInfo,
        });
      })
      .catch((error: AxiosError) => {
        if (error.message === "canceled") {
          console.log(`---> caiyun canceled`);
          return reject(undefined);
        }

        console.error(`---> Caiyun translate error: ${error}`);
        console.error("caiyun error response: ", error.response);
        const errorInfo = getTypeErrorInfo(type, error);
        reject(errorInfo);
      });
  });
}
