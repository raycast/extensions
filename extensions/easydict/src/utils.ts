/*
 * @author: tisfeng
 * @createTime: 2022-06-26 11:13
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-07-23 23:29
 * @fileName: utils.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { Clipboard, getApplications, getPreferenceValues, LocalStorage } from "@raycast/api";
import { eudicBundleId } from "./components";
import { clipboardQueryTextKey, languageItemList } from "./consts";
import { Easydict } from "./releaseVersion/versionInfo";
import { LanguageItem, MyPreferences, QueryRecoredItem, QueryWordInfo, TranslateFormatResult } from "./types";

// Time interval for automatic query of the same clipboard text, avoid frequently querying the same word. Default 10min
export const clipboardQueryInterval = 10 * 60 * 1000;

export const maxLineLengthOfChineseTextDisplay = 45;
export const maxLineLengthOfEnglishTextDisplay = 95;

export const myPreferences: MyPreferences = getPreferenceValues();
export const defaultLanguage1 = getLanguageItemFromYoudaoId(myPreferences.language1) as LanguageItem;
export const defaultLanguage2 = getLanguageItemFromYoudaoId(myPreferences.language2) as LanguageItem;
export const preferredLanguages = [defaultLanguage1, defaultLanguage2];

export function getLanguageItemFromYoudaoId(youdaoLanguageId: string): LanguageItem {
  for (const langItem of languageItemList) {
    if (langItem.youdaoLanguageId === youdaoLanguageId) {
      return langItem;
    }
  }
  return languageItemList[0];
}

/**
 * get language item from tencent language id, if not found, return auto language item
 */
export function getLanguageItemFromTencentId(tencentLanguageId: string): LanguageItem {
  for (const langItem of languageItemList) {
    const tencentDetectLanguageId = langItem.tencentDetectLanguageId || langItem.tencentLanguageId;
    if (tencentDetectLanguageId === tencentLanguageId) {
      return langItem;
    }
  }
  return languageItemList[0];
}

/**
 * return language item from apple Chinese title, such as "中文" --> LanguageItem
 *
 * Todo: currently only support Chinese, later support other languages
 */
export function getLanguageItemFromAppleChineseTitle(chineseTitle: string): LanguageItem {
  for (const langItem of languageItemList) {
    if (langItem.appleDetectChineseLanguageTitle === chineseTitle) {
      return langItem;
    }
  }
  return languageItemList[0];
}

/**
 * Return language item from deepL language id, if not found, return auto language item
 */
export function getLanguageItemFromDeepLSourceId(deepLLanguageId: string): LanguageItem {
  for (const langItem of languageItemList) {
    if (langItem.deepLSourceLanguageId === deepLLanguageId) {
      return langItem;
    }
  }
  return languageItemList[0];
}

/**
 * Get language item from franc language id
 */
export function getLanguageItemFromFrancId(francLanguageId: string): LanguageItem {
  for (const langItem of languageItemList) {
    if (langItem.francLanguageId === francLanguageId) {
      return langItem;
    }
  }
  return languageItemList[0];
}

/**
 * Check language id is valid, except 'auto', ''
 */
export function isValidLanguageId(languageId: string): boolean {
  if (languageId === "auto" || languageId.length === 0) {
    return false;
  }
  return true;
}

/**
 * get another language item expcept chinese from language item array
 */
export function getLanguageOfTwoExceptChinese(youdaoLanguageIds: [string, string]): string {
  if (youdaoLanguageIds[0] === "zh-CHS") {
    return youdaoLanguageIds[1];
  } else {
    return youdaoLanguageIds[0];
  }
}

/**
 * Determine whether the title of the result exceeds the maximum value of one line.
 */
export function isTranslateResultTooLong(formatResult: TranslateFormatResult | null): boolean {
  if (!formatResult) {
    return false;
  }

  const isChineseTextResult = formatResult.queryWordInfo.toLanguage === "zh-CHS";
  const isEnglishTextResult = formatResult.queryWordInfo.toLanguage === "en";

  for (const translation of formatResult.translationItems) {
    const textLength = translation.text.length;
    if (isChineseTextResult) {
      if (textLength > maxLineLengthOfChineseTextDisplay) {
        return true;
      }
    } else if (isEnglishTextResult) {
      if (textLength > maxLineLengthOfEnglishTextDisplay) {
        return true;
      }
    } else if (textLength > maxLineLengthOfEnglishTextDisplay) {
      return true;
    }
  }
  return false;
}

export function getEudicWebTranslateURL(queryTextInfo: QueryWordInfo): string {
  const languageId = getLanguageOfTwoExceptChinese([queryTextInfo.fromLanguage, queryTextInfo.toLanguage]);
  const eudicWebLanguageId = getLanguageItemFromYoudaoId(languageId).eudicWebLanguageId;
  if (eudicWebLanguageId) {
    return `https://dict.eudic.net/dicts/${eudicWebLanguageId}/${encodeURI(queryTextInfo.word)}`;
  }
  return "";
}

export function getYoudaoWebTranslateURL(queryTextInfo: QueryWordInfo): string {
  const languageId = getLanguageOfTwoExceptChinese([queryTextInfo.fromLanguage, queryTextInfo.toLanguage]);
  const youdaoWebLanguageId = getLanguageItemFromYoudaoId(languageId).youdaoWebLanguageId;
  if (youdaoWebLanguageId) {
    return `https://www.youdao.com/w/${youdaoWebLanguageId}/${encodeURI(queryTextInfo.word)}`;
  }
  return "";
}

export function getGoogleWebTranslateURL(queryTextInfo: QueryWordInfo): string {
  const fromLanguageItem = getLanguageItemFromYoudaoId(queryTextInfo.fromLanguage);
  const toLanguageItem = getLanguageItemFromYoudaoId(queryTextInfo.toLanguage);
  const fromLanguageId = fromLanguageItem.googleLanguageId || fromLanguageItem.youdaoLanguageId;
  const toLanguageId = toLanguageItem.googleLanguageId || toLanguageItem.youdaoLanguageId;
  const text = encodeURI(queryTextInfo.word);
  return `https://translate.google.cn/?sl=${fromLanguageId}&tl=${toLanguageId}&text=${text}&op=translate`;
}

/**
 * Get DeepL web translate url
 * https://www.deepl.com/translator#en/zh/look
 */
export function getDeepLWebTranslateURL(queryTextInfo: QueryWordInfo): string {
  const fromLanguageItem = getLanguageItemFromYoudaoId(queryTextInfo.fromLanguage);
  const toLanguageItem = getLanguageItemFromYoudaoId(queryTextInfo.toLanguage);
  const fromLanguageId = fromLanguageItem.deepLSourceLanguageId;
  const toLanguageId = toLanguageItem.deepLSourceLanguageId;
  const text = encodeURI(queryTextInfo.word);
  if (fromLanguageId && toLanguageId) {
    return `https://www.deepl.com/translator#${fromLanguageId}/${toLanguageId}/${text}`;
  }
  return "";
}

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
 * return and update the autoSelectedTargetLanguage according to the languageId
 */
export function getAutoSelectedTargetLanguageId(accordingLanguageId: string): string {
  let targetLanguageId = "auto";
  if (accordingLanguageId === defaultLanguage1.youdaoLanguageId) {
    targetLanguageId = defaultLanguage2.youdaoLanguageId;
  } else if (accordingLanguageId === defaultLanguage2.youdaoLanguageId) {
    targetLanguageId = defaultLanguage1.youdaoLanguageId;
  }

  const targetLanguage = getLanguageItemFromYoudaoId(targetLanguageId);

  console.log(`languageId: ${accordingLanguageId}, auto selected target: ${targetLanguage.youdaoLanguageId}`);
  return targetLanguage.youdaoLanguageId;
}

/**
 * traverse all applications, check if Eudic is installed
 */
async function traverseAllInstalledApplications(updateIsInstalledEudic: (isInstalled: boolean) => void) {
  const installedApplications = await getApplications();
  LocalStorage.setItem(eudicBundleId, false);
  updateIsInstalledEudic(false);

  for (const application of installedApplications) {
    console.log(application.bundleId);
    if (application.bundleId === eudicBundleId) {
      updateIsInstalledEudic(true);
      LocalStorage.setItem(eudicBundleId, true);

      console.log("isInstalledEudic: true");
    }
  }
}

export function checkIfEudicIsInstalled(setIsInstalledEudic: (isInstalled: boolean) => void) {
  LocalStorage.getItem<boolean>(eudicBundleId).then((isInstalledEudic) => {
    console.log("is install Eudic: ", isInstalledEudic);
    if (isInstalledEudic == true) {
      setIsInstalledEudic(true);
    } else if (isInstalledEudic == false) {
      setIsInstalledEudic(false);
    } else {
      traverseAllInstalledApplications(setIsInstalledEudic);
    }
  });
}

export function checkIfNeedShowReleasePrompt(callback: (isShowing: boolean) => void) {
  const currentEasydict = new Easydict();
  currentEasydict.getCurrentVersionInfo().then((easydict) => {
    const isShowingReleasePrompt = easydict.isNeedPrompt && !easydict.hasPrompted;
    // console.log("isShowingReleasePrompt: ", isShowingReleasePrompt);
    callback(isShowingReleasePrompt);
  });
}

export function checkIfShowMultipleTranslations(formatResult: TranslateFormatResult) {
  return !formatResult.explanations && !formatResult.forms && !formatResult.webPhrases && !formatResult.webTranslation;
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
