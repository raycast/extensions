import { getSelectedText, copyTextToClipboard, ToastStyle, showToast, getPreferenceValues } from "@raycast/api";
import got from "got";

interface Preferences {
  key: string;
  pro: boolean;
}
const translate = async (target: string) => {
  const preferences: Preferences = getPreferenceValues();
  const key = preferences.key;
  const pro = preferences.pro;
  try {
    const text = await getSelectedText();
    try {
      const response = await got(
        `https://api${pro ? "" : "-free"}.deepl.com/v2/translate?auth_key=${key}&text=${text}&target_lang=${target}`
      );
      const translation = JSON.parse(response.body).translations[0].text;
      copyTextToClipboard(translation);
      await showToast(ToastStyle.Success, "The translation was copied to your clipboard.");
    } catch (e) {
      console.log(e);
      await showToast(
        ToastStyle.Failure,
        "Something went wrong",
        "Check your internet connection, API key, or you've maxed out the API."
      );
    }
  } catch (error) {
    await showToast(ToastStyle.Failure, "Please select the text to be translated");
  }
};

const source_languages = {
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
};

const target_languages = {
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
};

export { source_languages, target_languages, translate };
