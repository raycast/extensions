import { Clipboard, environment, getApplications, getPreferenceValues, LocalStorage } from "@raycast/api";
import { eudicBundleId } from "./components";
import { clipboardQueryTextKey, languageItemList } from "./consts";
import { LanguageItem, MyPreferences, QueryRecoredItem, TranslateFormatResult } from "./types";

import CryptoJS from "crypto-js";

// Time interval for automatic query of the same clipboard text, avoid frequently querying the same word. Default 10min
export const clipboardQueryInterval = 10 * 60 * 1000;

export const maxLineLengthOfChineseTextDisplay = 45;
export const maxLineLengthOfEnglishTextDisplay = 95;

export const myPreferences: MyPreferences = getPreferenceValues();
export const defaultLanguage1 = getLanguageItemFromLanguageId(myPreferences.language1);
export const defaultLanguage2 = getLanguageItemFromLanguageId(myPreferences.language2);

const defaultEncrytedYoudaoAppId = "U2FsdGVkX19SpBCGxMeYKP0iS1PWKmvPeqIYNaZjAZC142Y5pLrOskw0gqHGpVS1";
const defaultEncrytedYoudaoAppKey =
  "U2FsdGVkX1/JF2ZMngmTw8Vm+P0pHWmHKLQhGpUtYiDc0kLZl6FKw1Vn3hMyl7iL7owwReGJCLsovDxztZKb9g==";
export const defaultYoudaoAppId = myDecrypt(defaultEncrytedYoudaoAppId);
export const defaultYoudaoAppSecret = myDecrypt(defaultEncrytedYoudaoAppKey);

const defaultEncryptedBaiduAppId = "U2FsdGVkX1/QHkSw+8qxr99vLkSasBfBRmA6Kb5nMyjP8IJazM9DcOpd3cOY6/il";
const defaultEncryptedBaiduAppSecret = "U2FsdGVkX1+a2LbZ0+jntJTQjpPKUNWGrlr4NSBOwmlah7iP+w2gefq1UpCan39J";
export const defaultBaiduAppId = myDecrypt(defaultEncryptedBaiduAppId);
export const defaultBaiduAppSecret = myDecrypt(defaultEncryptedBaiduAppSecret);

const defaultEncryptedTencentSecretId =
  "U2FsdGVkX19lHBVXE+CEZI9cENSToLIGzHDsUIE+RyvIC66rgxumDmpYPDY4MdaTSbrq7MIyDvtgXaLvzijYSg==";
const defaultEncryptedTencentSecretKey =
  "U2FsdGVkX1+N6wDYXNiUISwKOM97cY03RjXmC+0+iodFo3b4NTNC1J8RR6xqcbdyF7z3Z2yQRMHHxn4m02aUvA==";
export const defaultTencentSecretId = myDecrypt(defaultEncryptedTencentSecretId);
export const defaultTencentSecretKey = myDecrypt(defaultEncryptedTencentSecretKey);

const defaultEncryptedCaiyunToken = "U2FsdGVkX1+ihWvHkAfPMrWHju5Kg4EXAm1AVbXazEeHaXE1jdeUzZZrhjdKmS6u";
export const defaultCaiyunToken = myDecrypt(defaultEncryptedCaiyunToken);

// export function: Determine whether the title of the result exceeds the maximum value of one line.
export function isTranslateResultTooLong(formatResult: TranslateFormatResult | null): boolean {
  if (!formatResult) {
    return false;
  }

  const isChineseTextResult = formatResult.queryWordInfo.toLanguage === "zh-CHS";
  const isEnglishTextResult = formatResult.queryWordInfo.toLanguage === "en";

  for (const translation of formatResult.translations) {
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

export function isPreferredChinese(): boolean {
  const lanuguageIdPrefix = "zh";
  const preferences: MyPreferences = getPreferenceValues();
  if (preferences.language1.startsWith(lanuguageIdPrefix) || preferences.language2.startsWith(lanuguageIdPrefix)) {
    return true;
  }
  return false;
}

export function getLanguageItemFromLanguageId(youdaoLanguageId: string): LanguageItem {
  for (const langItem of languageItemList) {
    if (langItem.youdaoLanguageId === youdaoLanguageId) {
      return langItem;
    }
  }
  return {
    youdaoLanguageId: "",
    aliyunLanguageId: "",
    languageTitle: "",
    languageVoice: [""],
  };
}

export function getLanguageItemFromTencentDetectLanguageId(tencentLanguageId: string): LanguageItem {
  for (const langItem of languageItemList) {
    const tencentDetectLanguageId = langItem.tencentDetectLanguageId || langItem.tencentLanguageId;
    if (tencentDetectLanguageId === tencentLanguageId) {
      return langItem;
    }
  }
  return {
    youdaoLanguageId: "",
    aliyunLanguageId: "",
    languageTitle: "",
    languageVoice: [""],
  };
}

// function: get another language item expcept chinese

function getLanguageItemExpceptChinese(from: LanguageItem, to: LanguageItem): LanguageItem {
  if (from.youdaoLanguageId === "zh-CHS") {
    return to;
  } else {
    return from;
  }
}

export function getEudicWebTranslateURL(queryText: string, from: LanguageItem, to: LanguageItem): string {
  const eudicWebLanguageId = getLanguageItemExpceptChinese(from, to).eudicWebLanguageId;
  if (eudicWebLanguageId) {
    return `https://dict.eudic.net/dicts/${eudicWebLanguageId}/${encodeURI(queryText)}`;
  }
  return "";
}

export function getYoudaoWebTranslateURL(queryText: string, from: LanguageItem, to: LanguageItem): string {
  const youdaoWebLanguageId = getLanguageItemExpceptChinese(from, to).youdaoWebLanguageId;
  if (youdaoWebLanguageId) {
    return `https://www.youdao.com/w/${youdaoWebLanguageId}/${encodeURI(queryText)}`;
  }
  return "";
}

export function getGoogleWebTranslateURL(queryText: string, from: LanguageItem, to: LanguageItem): string {
  const fromLanguageId = from.googleLanguageId || from.youdaoLanguageId;
  const toLanguageId = to.googleLanguageId || to.youdaoLanguageId;
  const text = encodeURI(queryText);
  return `https://translate.google.cn/?sl=${fromLanguageId}&tl=${toLanguageId}&text=${text}&op=translate`;
}

// function: query the clipboard text from LocalStorage
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

// function: save last Clipboard text and timestamp
export function saveQueryClipboardRecord(text: string) {
  const jsonString: string = JSON.stringify({
    queryText: text,
    timestamp: new Date().getTime(),
  });
  LocalStorage.setItem(clipboardQueryTextKey, jsonString);

  console.log("saveQueryClipboardRecord: " + jsonString);
}

// function: remove all punctuation from the text
export function removeEnglishPunctuation(text: string) {
  return text.replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-./:;<=>?@[\]^_`{|}~]/g, "");
}

// function: remove all Chinese punctuation and blank space from the text
export function removeChinesePunctuation(text: string) {
  return text.replace(
    /[\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]/g,
    ""
  );
}

// function: remove all punctuation from the text
export function removePunctuation(text: string) {
  return removeEnglishPunctuation(removeChinesePunctuation(text));
}

// function: remove all blank space from the text
export function removeBlankSpace(text: string) {
  return text.replace(/\s/g, "");
}

// function: check if the text contains Chinese characters
export function isContainChinese(text: string) {
  return /[\u4e00-\u9fa5]/g.test(text);
}

// function: check if text isEnglish or isNumber
export function isEnglishOrNumber(text: string) {
  const pureText = removePunctuation(removeBlankSpace(text));
  console.log("pureText: " + pureText);
  return /^[a-zA-Z0-9]+$/.test(pureText);
}

// function: get the language type represented by the string, priority to use English and Chinese, and then auto
export function detectInputTextLanguageId(inputText: string): string {
  let fromLanguageId = "auto";
  const EnglishLanguageId = "en";
  const ChineseLanguageId = "zh-CHS";
  if (
    isEnglishOrNumber(inputText) &&
    (defaultLanguage1.youdaoLanguageId === EnglishLanguageId || defaultLanguage2.youdaoLanguageId === EnglishLanguageId)
  ) {
    fromLanguageId = EnglishLanguageId;
  } else if (
    isContainChinese(inputText) &&
    (defaultLanguage1.youdaoLanguageId === ChineseLanguageId || defaultLanguage2.youdaoLanguageId === ChineseLanguageId)
  ) {
    fromLanguageId = ChineseLanguageId;
  }

  console.log("fromLanguage-->:", fromLanguageId);
  return fromLanguageId;
}

// function: return and update the autoSelectedTargetLanguage according to the languageId
export function getAutoSelectedTargetLanguageId(accordingLanguageId: string): string {
  let targetLanguageId = "auto";
  if (accordingLanguageId === defaultLanguage1.youdaoLanguageId) {
    targetLanguageId = defaultLanguage2.youdaoLanguageId;
  } else if (accordingLanguageId === defaultLanguage2.youdaoLanguageId) {
    targetLanguageId = defaultLanguage1.youdaoLanguageId;
  }

  const targetLanguage = getLanguageItemFromLanguageId(targetLanguageId);

  console.log(`languageId: ${accordingLanguageId}, auto selected target: ${targetLanguage.youdaoLanguageId}`);
  return targetLanguage.youdaoLanguageId;
}

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

export function checkIsInstalledEudic(setIsInstalledEudic: (isInstalled: boolean) => void) {
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

export function myEncrypt(text: string) {
  // console.warn("encrypt:", text);
  const ciphertext = CryptoJS.AES.encrypt(text, environment.extensionName).toString();
  // console.warn("ciphertext: ", ciphertext);
  return ciphertext;
}

export function myDecrypt(ciphertext: string) {
  // console.warn("decrypt:", ciphertext);
  const bytes = CryptoJS.AES.decrypt(ciphertext, environment.extensionName);
  const originalText = bytes.toString(CryptoJS.enc.Utf8);
  // console.warn("originalText: ", originalText);
  return originalText;
}

export function isShowMultipleTranslations(formatResult: TranslateFormatResult) {
  return !formatResult.explanations && !formatResult.forms && !formatResult.webPhrases && !formatResult.webTranslation;
}
