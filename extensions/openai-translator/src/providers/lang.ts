/* eslint-disable no-control-regex */
/* eslint-disable no-misleading-character-class */

import ISO6391 from "iso-639-1";
import detect from "./lang_recognizer_wrapper";
import { dropdownDataByName } from "../raycast-utils";

export const supportLanguages: [string, string][] =
  dropdownDataByName("toLang")?.map((lang) => [lang.value, lang.title]) || [];

export const langMap: Map<string, string> = new Map(supportLanguages);
export const langMapReverse = new Map(supportLanguages.map(([standardLang, lang]) => [lang, standardLang]));

const chineseLangCodes = ["zh-TW", "zh-Hans", "zh-Hant", "wyw", "yue", "jdbhw", "xdbhw"];

export const isChineseLangCode = (langCode: string) => chineseLangCodes.indexOf(langCode) >= 0;

export async function detectLang(text: string): Promise<string | null> {
  try {
    return await detect(text);
  } catch (error) {
    return null;
  }
}

export function getLangName(langCode: string): string {
  switch (langCode) {
    case "zh-Hans":
      return "Simplified Chinese";
    case "zh-Hant":
      return "Traditional Chinese";
    case "yue":
      return "Cantonese";
    case "hmn":
      return "Hmong";
    default:
  }
  const langName = ISO6391.getName(langCode);
  if (langName) {
    return langName;
  }
  return langMap.get(langCode) || langCode;
}
