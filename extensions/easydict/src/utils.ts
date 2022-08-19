/*
 * @author: tisfeng
 * @createTime: 2022-08-04 12:28
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-18 17:09
 * @fileName: utils.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { Clipboard, getApplications, LocalStorage, showToast, Toast } from "@raycast/api";
import { AxiosError } from "axios";
import { clipboardQueryTextKey } from "./consts";
import { myPreferences } from "./preferences";
import { Easydict } from "./releaseVersion/versionInfo";
import { DicionaryType, QueryRecoredItem, QueryType, RequestErrorInfo } from "./types";

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
      const queryRecoredItem: QueryRecoredItem = JSON.parse(jsonString);
      const timestamp = queryRecoredItem.timestamp;
      const queryText = queryRecoredItem.queryText;
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
 * Trim the text to the max length, default 2000.
 *
 * 例如，百度翻译 query 长度限制：为保证翻译质量，请将单次请求长度控制在 6000 bytes 以内（汉字约为输入参数 2000 个）
 */
export function trimTextLength(text: string, length = 2000) {
  text = text.trim();
  if (text.length > length) {
    return text.substring(0, length) + "...";
  }
  return text.substring(0, length);
}

/**
 * Get enabled dictionary services.
 */
export function getEnabledDictionaryServices(): DicionaryType[] {
  const enabledDictionaryServices: DicionaryType[] = [];
  if (myPreferences.enableLingueeDictionary) {
    enabledDictionaryServices.push(DicionaryType.Linguee);
  }
  if (myPreferences.enableYoudaoDictionary) {
    enabledDictionaryServices.push(DicionaryType.Youdao);
  }
  return enabledDictionaryServices;
}

/**
 * Show error toast according to errorInfo.
 */
export function showErrorToast(errorInfo: RequestErrorInfo) {
  showToast({
    style: Toast.Style.Failure,
    title: `${errorInfo.type} Error: ${errorInfo.code || ""}`,
    message: errorInfo.message,
  });
}

/**
 * Get request error info.
 */
export function getTypeErrorInfo(type: QueryType, error: AxiosError) {
  const errorCode = error.response?.status;
  const errorMessage = error.message || error.response?.statusText || "Response error";
  const errorInfo: RequestErrorInfo = {
    type: type,
    code: `${errorCode || ""}`,
    message: errorMessage,
  };
  return errorInfo;
}
