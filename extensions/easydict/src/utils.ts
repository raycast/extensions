import { Clipboard, getApplications, getPreferenceValues, LocalStorage } from "@raycast/api";
import { eudicBundleId } from "./components";
import { clipboardQueryTextKey, languageItemList } from "./consts";
import { LanguageItem, MyPreferences, QueryRecoredItem } from "./types";

// Time interval for automatic query of the same clipboard text, avoid frequently querying the same word. Default 10min
export const clipboardQueryInterval = 10 * 60 * 1000;

export const myPreferences: MyPreferences = getPreferenceValues();
export const defaultLanguage1 = getLanguageItemFromList(myPreferences.language1);
export const defaultLanguage2 = getLanguageItemFromList(myPreferences.language2);

export function truncate(string: string, length = 40, separator = "...") {
  if (string.length <= length) return string;
  return string.substring(0, length) + separator;
}

export function isPreferredChinese(): boolean {
  const lanuguageIdPrefix = "zh";
  const preferences: MyPreferences = getPreferenceValues();
  if (preferences.language1.startsWith(lanuguageIdPrefix) || preferences.language2.startsWith(lanuguageIdPrefix)) {
    return true;
  }
  return false;
}

export function getLanguageItemFromList(youdaoLanguageId: string): LanguageItem {
  for (const langItem of languageItemList) {
    if (langItem.youdaoLanguageId === youdaoLanguageId) {
      return langItem;
    }
  }

  return {
    youdaoLanguageId: "",
    languageTitle: "",
    languageVoice: [""],
  };
}

function getAnotherLanguageItem(from: LanguageItem, to: LanguageItem): LanguageItem {
  const zh = "zh-CHS";
  if (from.youdaoLanguageId === zh) {
    return to;
  } else {
    return from;
  }
}

export function getEudicWebTranslateURL(queryText: string, from: LanguageItem, to: LanguageItem): string {
  const eudicWebLanguageId = getAnotherLanguageItem(from, to).eudicWebLanguageId;
  if (eudicWebLanguageId) {
    return `https://dict.eudic.net/dicts/${eudicWebLanguageId}/${encodeURI(queryText)}`;
  }
  return "";
}

export function getYoudaoWebTranslateURL(queryText: string, from: LanguageItem, to: LanguageItem): string {
  const youdaoWebLanguageId = getAnotherLanguageItem(from, to).youdaoWebLanguageId;
  if (youdaoWebLanguageId) {
    return `https://www.youdao.com/w/${youdaoWebLanguageId}/${encodeURI(queryText)}`;
  }
  return "";
}

export function getGoogleTranslateURL(queryText: string, from: LanguageItem, to: LanguageItem): string {
  const fromLanguageId = from.googleLanguageId || from.youdaoLanguageId;
  const toLanguageId = to.googleLanguageId || to.youdaoLanguageId;
  const text = encodeURI(queryText!);
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
export function getInputTextLanguageId(inputText: string): string {
  let fromLanguageId = "auto";
  const englishLanguageId = "en";
  const chineseLanguageId = "zh-CHS";
  if (
    isEnglishOrNumber(inputText) &&
    (defaultLanguage1.youdaoLanguageId === englishLanguageId || defaultLanguage2.youdaoLanguageId === englishLanguageId)
  ) {
    fromLanguageId = englishLanguageId;
  } else if (
    isContainChinese(inputText) &&
    (defaultLanguage1.youdaoLanguageId === chineseLanguageId || defaultLanguage2.youdaoLanguageId === chineseLanguageId)
  ) {
    fromLanguageId = chineseLanguageId;
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

  const targetLanguage = getLanguageItemFromList(targetLanguageId);

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

export function checkIsInstalledEudic(updateIsInstalledEudic: (isInstalled: boolean) => void) {
  LocalStorage.getItem<boolean>(eudicBundleId).then((isInstalledEudic) => {
    console.log("is install: ", isInstalledEudic);

    if (isInstalledEudic == true) {
      updateIsInstalledEudic(true);
    } else if (isInstalledEudic == false) {
      updateIsInstalledEudic(false);
    } else {
      traverseAllInstalledApplications(updateIsInstalledEudic);
    }
  });
}
