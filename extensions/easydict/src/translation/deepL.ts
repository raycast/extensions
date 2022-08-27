/*
 * @author: tisfeng
 * @createTime: 2022-08-03 10:18
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-19 23:13
 * @fileName: deepL.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { LocalStorage } from "@raycast/api";
import axios, { AxiosError } from "axios";
import querystring from "node:querystring";
import { requestCostTime } from "../axiosConfig";
import { QueryWordInfo } from "../dictionary/youdao/types";
import { getDeepLLanguageId } from "../language/languages";
import { KeyStore, myDecrypt, myEncrypt } from "../preferences";
import { DeepLTranslateResult, QueryTypeResult, TranslationType } from "../types";
import { getTypeErrorInfo } from "../utils";

const deepLAuthStoredKey = "deepLAuthStoredKey";

/**
 * DeepL translate API. Cost time: > 1s
 *
 * https://www.deepl.com/zh/docs-api/translating-text
 */
export async function requestDeepLTextTranslate(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  console.log(`---> start rquest DeepL`);
  const { fromLanguage, toLanguage, word } = queryWordInfo;
  const sourceLang = getDeepLLanguageId(fromLanguage);
  const targetLang = getDeepLLanguageId(toLanguage);

  // if language is not supported, return null
  if (!sourceLang || !targetLang) {
    console.log(`DeepL translate not support language: ${fromLanguage} --> ${toLanguage}`);
    const result: QueryTypeResult = {
      type: TranslationType.DeepL,
      result: undefined,
      translations: [],
      wordInfo: queryWordInfo,
    };
    return Promise.resolve(result);
  }

  const deepLAuthKey = await getDeepLAuthKey();

  // * deepL api free and deepL pro api use different url host.
  const url = deepLAuthKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
  const params = {
    auth_key: deepLAuthKey,
    text: word,
    source_lang: sourceLang,
    target_lang: targetLang,
  };
  // console.log(`---> deepL params: ${JSON.stringify(params, null, 4)}`);

  return new Promise((resolve, reject) => {
    axios
      .post(url, querystring.stringify(params))
      .then((response) => {
        const deepLResult = response.data as DeepLTranslateResult;
        const translatedText = deepLResult.translations[0].text;
        console.log(
          `DeepL translate: ${JSON.stringify(translatedText, null, 4)}, cost: ${response.headers[requestCostTime]} ms`
        );

        const deepLTypeResult: QueryTypeResult = {
          type: TranslationType.DeepL,
          result: deepLResult,
          translations: translatedText.split("\n"),
          wordInfo: queryWordInfo,
        };
        resolve(deepLTypeResult);
      })
      .catch((error: AxiosError) => {
        if (error.message === "canceled") {
          console.log(`---> deepL canceled`);
          return;
        }

        console.error("deepL error: ", error);

        const errorInfo = getTypeErrorInfo(TranslationType.DeepL, error);
        const errorCode = error.response?.status;

        // https://www.deepl.com/zh/docs-api/accessing-the-api/error-handling/
        if (errorCode === 456) {
          errorInfo.message = "Quota exceeded"; // Quota exceeded. The character limit has been reached.
          if (wildEncryptedDeepLKeys.length) {
            getAndStoreDeepLKey(wildEncryptedDeepLKeys).then(() => {
              requestDeepLTextTranslate(queryWordInfo);
              return;
            });
          }
        }
        if (errorCode === 403) {
          errorInfo.message = "Authorization failed"; // Authorization failed. Please supply a valid auth_key parameter.
        }

        console.error("deepL error info: ", errorInfo);
        reject(errorInfo);
      });
  });
}

/**
 * This deepl key is from Github, we do not guarantee that it will work all the time.
 * https://github.com/search?p=1&q=deepl+key+%3Afx&type=Code
 */
const wildEncryptedDeepLKeys = [
  "U2FsdGVkX19Mt7cnRCJQINAzLGqqZAhqPcbxeKrBUV62/Dd0u1Qa0QxY8ljYWjmCAz8NwG+uOmD8Ez0HijCJnw==",
  "U2FsdGVkX1+7yAdmxTGWdRJ6oeDcZ+1YzndxtkdpuOk6jWBjNezThjj8NgT+flfxOPccJXXlIilvRssFzPnagg==",
  "U2FsdGVkX1+NJ1HnZbrmW0KMdbTTHPAE2LmATthkMS2EFt1lJ0W74GBi+rlwJeBKZrn6R9ne4fdI7WV0vpCcrQ==",
  "U2FsdGVkX1856l+ibQOyYvNwU53suxx6UHzBT1xBuIzhh5JvHmD/qG5gImiDpJbw62LWQxBXNn7kRvM+O2jRYg==",
  "U2FsdGVkX190UMu/gorJ/qgwhayFJilCPE5kSfOutkELsUnylfAZEtJGVPin3njGRwC2odphwTigbCzEcJ4kAw==",
  "U2FsdGVkX1+iLWPtCcBXjS4TLLbBql8KOU4wvfcGhm/nAcYIu2BIaco8iORmW9CCKEKSLkUd3aSCaSDPgnuClA==",
  "U2FsdGVkX1/seyI1CRkqz8+73B33fCplJrqDNkiXC83XBr3Jc8Rz14Bhx6ldVbpkcy8sk18/CQyCAWbgiJPEjQ==",
  "U2FsdGVkX1/vD+AUbRlTFmGMqQGsbzjngY2NUwiLgYrMRA9KD0sTI7Xq8DJz3aMpB8PAuZZMcMFmqjedu5yobw==",
  "U2FsdGVkX1+1Iexu0P8IEaxZchH/LYi9BCAQNbt8d0ImP0/NyTc+W3JhlBtTcB31SfstKOURNQQW6Ol3ZCxfew==",
  "U2FsdGVkX1+yGtuvj9lX2qJZXMiaAs1KMB3jwK0SPnVGfATSyXC8LGBnVTyX6TNyLvSvnINJQp1dLZzDb85bLQ==",
  "U2FsdGVkX1/61u2OfkPsFuw54CA3I1imQ5FwUymFsvkyaOXQkMm+sr+NGGlfLvHNcp6SvQgmrQuof8F/pRY51w==",
];

/**
 * Get a deepL key.
 *
 * 1. try to get user's deepL key from preference.
 * 2. if not found, try to get stored deepL key from local storage.
 * 3. if not found, use default deepL key.
 */
export function getDeepLAuthKey(): Promise<string> {
  return new Promise((resolve) => {
    const userKey = KeyStore.userDeepLAuthKey;
    if (userKey) {
      // console.log(`---> user deepL key: ${userKey}`);
      resolve(userKey);
    }

    const decryptedKey = myDecrypt(KeyStore.defaultEncryptedDeepLAuthKey);
    LocalStorage.getItem<string>(deepLAuthStoredKey).then((key) => {
      if (key) {
        resolve(key);
      } else {
        console.warn(`no stored deepL key, use default key`);
        resolve(decryptedKey);
      }
    });
  });
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface DeepLUsage {
  character_count: number;
  character_limit: number;
}

/**
 * Check if key is valid.
 *
 * https://www.deepl.com/zh/docs-api/other-functions/monitoring-usage/
 */
function checkIfKeyVaild(key: string): Promise<boolean> {
  console.log(`test a deepL key: ${key}`);
  const url = "https://api-free.deepl.com/v2/usage";
  const params = {
    auth_key: key,
  };

  return new Promise((resolve) => {
    axios
      .post(url, querystring.stringify(params))
      .then((res) => {
        const usage = res.data as DeepLUsage;
        console.log(`---> deepL usage: ${JSON.stringify(usage)}`);
        if (usage.character_count < usage.character_limit) {
          console.log(`---> valid key: ${key}`);
          resolve(true);
        } else {
          console.log(`---> execeded quota: ${key}`);
          resolve(false);
        }
      })
      .catch((err) => {
        console.error(`---> isVaildKey deepL error: ${err}`);

        // if error, remove key from wildEncryptedDeepLKeys
        const encryptedKey = myEncrypt(key);
        wildEncryptedDeepLKeys.splice(wildEncryptedDeepLKeys.indexOf(encryptedKey), 1);
        console.log(`---> remove error key: ${key}`);

        resolve(false);
      });
  });
}

/**
 * Get a deepL key and store it. Do not check if key is valid.
 */
export async function getAndStoreDeepLKey(encryptedKeys: string[]): Promise<string> {
  for (const encryptedKey of encryptedKeys) {
    const key = myDecrypt(encryptedKey);
    // remove key
    encryptedKeys.splice(encryptedKeys.indexOf(encryptedKey), 1);
    console.log(`---> find and store new key: ${key}`);
    LocalStorage.setItem(deepLAuthStoredKey, key);
    return Promise.resolve(key);
  }

  console.log(`---> no valid key, use defatul deepl key`);
  const defaultDeepLAuthKey = myDecrypt(KeyStore.defaultEncryptedDeepLAuthKey);
  return Promise.resolve(defaultDeepLAuthKey);
}

/**
 * Get a valid deepL key and store it.
 */
export async function getAndStoreValidDeepLKey(encryptedKeys: string[]): Promise<string> {
  if (encryptedKeys.length > 0) {
    for (const encryptedKey of encryptedKeys) {
      const key = myDecrypt(encryptedKey);
      if (await checkIfKeyVaild(key)) {
        // remove key
        encryptedKeys.splice(encryptedKeys.indexOf(encryptedKey), 1);
        console.log(`---> find and store new key: ${key}`);
        LocalStorage.setItem(deepLAuthStoredKey, key);
        return Promise.resolve(key);
      }
    }
  }
  console.log(`---> no valid key, use defatul deepl key`);
  const defaultDeepLAuthKey = myDecrypt(KeyStore.defaultEncryptedDeepLAuthKey);
  return Promise.resolve(defaultDeepLAuthKey);
}
