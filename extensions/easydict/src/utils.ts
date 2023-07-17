/*
 * @author: tisfeng
 * @createTime: 2022-08-04 12:28
 * @lastEditor: tisfeng
 * @lastEditTime: 2023-03-17 23:41
 * @fileName: utils.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { Clipboard, getApplications, LocalStorage, showToast, Toast } from "@raycast/api";
import { AxiosError } from "axios";
import CryptoJS from "crypto-js";
import { clipboardQueryTextKey } from "./consts";
import { LanguageDetectType } from "./detectLanguage/types";
import { LingueeListItemType } from "./dictionary/linguee/types";
import { QueryWordInfo, YoudaoDictionaryListItemType } from "./dictionary/youdao/types";
import { myPreferences } from "./preferences";
import { Easydict } from "./releaseVersion/versionInfo";
import {
  DictionaryType,
  ListDisplayItem,
  QueryRecordedItem as QueryRecordedItem,
  QueryType,
  RequestErrorInfo,
  RequestType,
  TranslationType,
} from "./types";

/**
 * Max length for word to query dictionary.
 */
const maxWordLength = 20;

/**
 * Eudic bundleIds.
 *
 * There are two Eudic versions on the Mac, one free version bundleId is `com.eusoft.freeeudic`, and the other paid version bundleId is `com.eusoft.eudic`. But their URL Schemes are the same, eudic://
 */
const eudicBundleIds = ["com.eusoft.freeeudic", "com.eusoft.eudic"];

// Time interval for automatic query of the same clipboard text, avoid frequently querying the same word. Default 10min
const clipboardQueryInterval = 10 * 60 * 1000;

/**
 * query the clipboard text from LocalStorage
 * * deprecate
 */
export async function tryQueryClipboardText(queryClipboardText: (text: string) => void) {
  const text = await Clipboard.readText();
  console.log("query clipboard text: " + text);
  if (text) {
    const jsonString = await LocalStorage.getItem<string>(clipboardQueryTextKey);
    console.log("query jsonString: " + jsonString);
    if (!jsonString) {
      queryClipboardText(text);
    }

    if (jsonString) {
      const queryRecordedItem: QueryRecordedItem = JSON.parse(jsonString);
      const timestamp = queryRecordedItem.timestamp;
      const queryText = queryRecordedItem.queryText;
      if (queryText === text) {
        const now = new Date().getTime();
        console.log(`before: ${new Date(timestamp).toUTCString()}`);
        console.log(`now:    ${new Date(now).toUTCString()}`);
        if (!timestamp || now - timestamp > clipboardQueryInterval) {
          queryClipboardText(text);
        }
      } else {
        queryClipboardText(text);
      }
    }
  }
}

/**
 * save last Clipboard text and timestamp
 */
export function saveQueryClipboardRecord(text: string) {
  const jsonString: string = JSON.stringify({
    queryText: text,
    timestamp: new Date().getTime(),
  });
  LocalStorage.setItem(clipboardQueryTextKey, jsonString);
  console.log("saveQueryClipboardRecord: " + jsonString);
}

/**
 * traverse all applications, check if Eudic is installed
 */
export async function checkIfInstalledEudic(): Promise<boolean> {
  const installedApplications = await getApplications(); // cost time: 20 ms
  for (const application of installedApplications) {
    const appBundleId = application.bundleId;
    if (appBundleId && eudicBundleIds.includes(appBundleId)) {
      return Promise.resolve(true);
    }
  }
  return Promise.resolve(false);
}

export function checkIfNeedShowReleasePrompt(callback: (isShowing: boolean) => void) {
  const currentEasydict = new Easydict();
  currentEasydict.getCurrentVersionInfo().then((easydict) => {
    const isShowingReleasePrompt = easydict.isNeedPrompt && !easydict.hasPrompted;
    // console.log("isShowingReleasePrompt: ", isShowingReleasePrompt);
    callback(isShowingReleasePrompt);
  });
}

/**
 * Trim the text to the max length, default 1830.
 *
 * * Note: google web translate max length is 1830.
 *
 * 例如，百度翻译 query 长度限制：为保证翻译质量，请将单次请求长度控制在 6000 bytes 以内（汉字约为输入参数 2000 个）
 */
export function trimTextLength(text: string, length = 1830) {
  text = text.trim();
  if (text.length > length) {
    return text.substring(0, length) + "...";
  }
  return text.substring(0, length);
}

/**
 * Get enabled dictionary services.
 */
export function getEnabledDictionaryServices(): DictionaryType[] {
  const enabledDictionaryServices: DictionaryType[] = [];
  if (myPreferences.enableLingueeDictionary) {
    enabledDictionaryServices.push(DictionaryType.Linguee);
  }
  if (myPreferences.enableYoudaoDictionary) {
    enabledDictionaryServices.push(DictionaryType.Youdao);
  }
  return enabledDictionaryServices;
}

/**
 * Show error toast according to errorInfo.
 */
export function showErrorToast(errorInfo: RequestErrorInfo | undefined) {
  if (!errorInfo?.type) {
    console.warn(`showErrorToast, errorInfo type is undefined: ${JSON.stringify(errorInfo, null, 4)}`);
    return;
  }

  console.error(`show error toast: ${JSON.stringify(errorInfo, null, 4)}`);
  const type = errorInfo.type.toString();
  showToast({
    style: Toast.Style.Failure,
    title: `${type} Error` + `${errorInfo.code ? `: ${errorInfo.code}` : ""}`,
    message: errorInfo.message,
  });
}

/**
 * Get request error info.
 */
export function getTypeErrorInfo(type: RequestType, error: AxiosError): RequestErrorInfo {
  const errorCode = error.response?.status;
  const errorMessage = error.response?.statusText || error.message || "something error 😭";
  const errorInfo: RequestErrorInfo = {
    type: type,
    code: `${errorCode || ""}`,
    message: errorMessage,
  };
  return errorInfo;
}

/**
 * Check is word, only word.length < 20 is valid.
 */
export function checkIsWordLength(word: string) {
  return word.trim().length < maxWordLength;
}

/**
 * Check queryWordInfo is word, not accurate, just a rough judgment.
 *
 * * Use queryWordInfo `isWord` when need accurate judgment.
 */
export function checkIsWord(queryWordInfo: QueryWordInfo) {
  if (queryWordInfo.isWord !== undefined) {
    return queryWordInfo.isWord;
  }
  return checkIsWordLength(queryWordInfo.word);
}

/**
 * Copy text to Clipboard.
 */
export function copyToClipboard(text: string) {
  Clipboard.copy(text);
}

/**
 * Check type is Dictionary type.
 */
export function checkIsDictionaryType(type: QueryType): boolean {
  if (Object.values(DictionaryType).includes(type as DictionaryType)) {
    return true;
  }
  return false;
}

/**
 * Check type is Translation type.
 */
export function checkIsTranslationType(type: QueryType): boolean {
  if (Object.values(TranslationType).includes(type as TranslationType)) {
    return true;
  }
  return false;
}

/**
 * check type is LanguageDetect type.
 */
export function checkIsLanguageDetectType(type: RequestType): boolean {
  if (Object.values(LanguageDetectType).includes(type as LanguageDetectType)) {
    return true;
  }
  return false;
}

/**
 * check type is YoudaoDictionaryListItem type.
 */
export function checkIsYoudaoDictionaryListItem(listItem: ListDisplayItem): boolean {
  const { queryType, displayType } = listItem;
  if (
    queryType === DictionaryType.Youdao &&
    Object.values(YoudaoDictionaryListItemType).includes(displayType as YoudaoDictionaryListItemType)
  ) {
    return true;
  }
  return false;
}

/**
 * check type is LingueeListItem type.
 */
export function checkIsLingueeListItem(listItem: ListDisplayItem): boolean {
  const { queryType, displayType } = listItem;
  if (
    queryType === DictionaryType.Linguee &&
    Object.values(LingueeListItemType).includes(displayType as LingueeListItemType)
  ) {
    return true;
  }
  return false;
}

export function md5(text: string): string {
  return CryptoJS.MD5(text).toString();
}

export function printObject(name: string, obj: unknown, space = 4) {
  console.log(`${name}: ${JSON.stringify(obj, null, space)}`);
}
