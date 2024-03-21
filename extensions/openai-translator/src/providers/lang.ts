/* eslint-disable no-control-regex */
/* eslint-disable no-misleading-character-class */

import ISO6391 from "iso-639-1";
import detect from "./lang_recognizer_wrapper";

export const supportLanguages: [string, string][] = [
  // ['auto', 'auto'],
  ["en", "English"],
  // ["zh", "中文"],
  ["zh-Hans", "简体中文"],
  ["zh-Hant", "繁體中文"],
  ["yue", "粤语"],
  ["lzh", "古文"],
  ["jdbhw", "近代白话文"],
  ["xdbhw", "现代白话文"],
  ["ja", "日本語"],
  ["ko", "한국어"],
  ["fr", "Français"],
  ["de", "Deutsch"],
  ["es", "Español"],
  ["it", "Italiano"],
  ["ru", "Русский"],
  ["pt", "Português"],
  ["nl", "Nederlands"],
  ["pl", "Polski"],
  ["ar", "العربية"],
  ["af", "Afrikaans"],
  ["am", "አማርኛ"],
  ["az", "Azərbaycan"],
  ["be", "Беларуская"],
  ["bg", "Български"],
  ["bn", "বাংলা"],
  ["bs", "Bosanski"],
  ["ca", "Català"],
  ["ceb", "Cebuano"],
  ["co", "Corsu"],
  ["cs", "Čeština"],
  ["cy", "Cymraeg"],
  ["da", "Dansk"],
  ["el", "Ελληνικά"],
  ["eo", "Esperanto"],
  ["et", "Eesti"],
  ["eu", "Euskara"],
  ["fa", "فارسی"],
  ["fi", "Suomi"],
  ["fj", "Fijian"],
  ["fy", "Frysk"],
  ["ga", "Gaeilge"],
  ["gd", "Gàidhlig"],
  ["gl", "Galego"],
  ["gu", "ગુજરાતી"],
  ["ha", "Hausa"],
  ["haw", "Hawaiʻi"],
  ["he", "עברית"],
  ["hi", "हिन्दी"],
  ["hmn", "Hmong"],
  ["hr", "Hrvatski"],
  ["ht", "Kreyòl Ayisyen"],
  ["hu", "Magyar"],
  ["hy", "Հայերեն"],
  ["id", "Bahasa Indonesia"],
  ["ig", "Igbo"],
  ["is", "Íslenska"],
  ["jw", "Jawa"],
  ["ka", "ქართული"],
  ["kk", "Қазақ"],
];

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
