import { getSelectedText, Clipboard, Toast, showToast, getPreferenceValues } from "@raycast/api";
import got from "got";


interface Preferences {
  key: string;
  pro: boolean;
}

export function getPreferences() {
  return getPreferenceValues<Preferences>()
}

export async function sendTranslateRequest({
  text: initialText,
  sourceLanguage,
  targetLanguage,
}: {
  text?: string,
  sourceLanguage?: string,
  targetLanguage: string,
}) {
  try {
    const text = initialText || await getSelectedText();

    const { key, pro } = getPreferences();

    try {
      const { translations: [{ text: translation }] } = await got.post(
        `https://api${pro ? "" : "-free"}.deepl.com/v2/translate`,
        {
          headers: {
            Authorization: `DeepL-Auth-Key ${key}`
          },
          json: {
            text: [text],
            source_lang: sourceLanguage,
            target_lang: targetLanguage,
          }
        }
      ).json<{ translations: { text: string }[] }>();
      await Clipboard.copy(translation);
      await showToast(Toast.Style.Success, "The translation was copied to your clipboard.");
      return translation;
    } catch (error) {
      console.error(error);
      await showToast(
        Toast.Style.Failure,
        "Something went wrong",
        "Check your internet connection, API key, or you've maxed out the API."
      );
    }
  } catch (error) {
    await showToast(Toast.Style.Failure, "Please select the text to be translated");
  }
}


export async function translate(target: string) {
  await sendTranslateRequest({ targetLanguage: target });
};

export const source_languages = {
  BG: "Bulgarian",
  ZH: "Chinese",
  CS: "Czech",
  DA: "Danish",
  NL: "Dutch",
  EN: "English",
  ET: "Estonian",
  FI: "Finnish",
  FR: "French",
  DE: "German",
  EL: "Greek",
  HU: "Hungarian",
  IT: "Italian",
  JA: "Japanese",
  LV: "Latvian",
  LT: "Lithuanian",
  PL: "Polish",
  PT: "Portuguese",
  RO: "Romanian",
  RU: "Russian",
  SK: "Slovak",
  SL: "Slovenian",
  ES: "Spanish",
  SV: "Swedish",
  UK: "Ukrainian",
};
export type SourceLanguage = keyof typeof source_languages;


export const target_languages = {
  BG: "Bulgarian",
  ZH: "Chinese",
  CS: "Czech",
  DA: "Danish",
  NL: "Dutch",
  "EN-GB": "English (UK)",
  "EN-US": "English (US)",
  ET: "Estonian",
  FI: "Finnish",
  FR: "French",
  DE: "German",
  EL: "Greek",
  HU: "Hungarian",
  IT: "Italian",
  JA: "Japanese",
  LV: "Latvian",
  LT: "Lithuanian",
  PL: "Polish",
  "PT-PT": "Portuguese",
  "PT-BR": "Portuguese (Brazil)",
  RO: "Romanian",
  RU: "Russian",
  SK: "Slovak",
  SL: "Slovenian",
  ES: "Spanish",
  SV: "Swedish",
  UK: "Ukrainian",
};
export type TargetLanguage = keyof typeof target_languages;