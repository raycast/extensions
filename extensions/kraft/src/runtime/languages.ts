/* eslint-disable no-control-regex */
/* eslint-disable no-misleading-character-class */

import ISO6391 from "iso-639-1";
import detect from "./language-recognizer-wrapper";
export { supportLanguages } from "./language-options";
import { supportLanguages } from "./language-options";

export const langMap: Map<string, string> = new Map(supportLanguages);
export const langMapReverse = new Map(supportLanguages.map(([standardLang, lang]) => [lang, standardLang]));

const chineseLangCodes = ["zh-TW", "zh-Hans", "zh-Hant", "wyw", "yue", "jdbhw", "xdbhw"];

export const isChineseLangCode = (langCode: string) => chineseLangCodes.indexOf(langCode) >= 0;

export async function detectLang(text: string): Promise<string | null> {
  try {
    return await detect(text);
  } catch {
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
