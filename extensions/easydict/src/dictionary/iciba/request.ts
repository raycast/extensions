import { RequestErrorInfo } from "../../types";
/*
 * @author: tisfeng
 * @createTime: 2022-06-27 10:26
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-16 15:50
 * @fileName: request.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import axios from "axios";
import { downloadAudio, getWordAudioPath } from "../../audio";
import { DictionaryType, QueryTypeResult } from "../../types";
import { QueryWordInfo } from "../youdao/types";
import { IcibaDictionaryResult } from "./interface";

/**
 * request iciba dictionary
 */
export function icibaDictionary(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  const url = "http://dict-co.iciba.com/api/dictionary.php";
  const params = {
    key: "0EAE08A016D6688F64AB3EBB2337BFB0",
    type: "json",
    w: queryWordInfo.word,
  };

  return new Promise((resolve, reject) => {
    axios
      .get(url, { params })
      .then((response) => {
        const result: QueryTypeResult = {
          type: DictionaryType.Iciba,
          result: response.data,
          translations: [],
          queryWordInfo: queryWordInfo,
        };
        resolve(result);
      })
      .catch((error) => {
        const errorInfo: RequestErrorInfo = {
          type: DictionaryType.Iciba,
          code: error.response?.status,
          message: error.response?.statusText,
        };
        reject(errorInfo);
      });
  });
}

/**
 * download icicba word audio file
 */
export async function downloadIcibaWordAudio(queryWordInfo: QueryWordInfo, callback?: () => void) {
  try {
    const icibaResult = await icibaDictionary(queryWordInfo);
    const icibaDictionaryResult = icibaResult.result as IcibaDictionaryResult;
    const symbol = icibaDictionaryResult.symbols[0];
    const phoneticUrl = symbol.ph_am_mp3.length
      ? symbol.ph_am_mp3
      : symbol.ph_tts_mp3.length
        ? symbol.ph_tts_mp3
        : symbol.ph_en_mp3;
    if (phoneticUrl.length) {
      const audioPath = getWordAudioPath(queryWordInfo.word);
      downloadAudio(phoneticUrl, audioPath, callback);
    }
    console.log(`iciba dictionary result: ${JSON.stringify(icibaDictionaryResult, null, 4)}`);
  } catch (error) {
    console.error(`download iciba audio error: ${error}`);
  }
}
