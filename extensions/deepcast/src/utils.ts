import {
  getSelectedText,
  Clipboard,
  Toast,
  showToast,
  getPreferenceValues,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import got from "got";
import { StatusCodes, getReasonPhrase } from "http-status-codes";

interface Preferences {
  key: string;
  onTranslateAction: "clipboard" | "view";
}

export function getPreferences() {
  return getPreferenceValues<Preferences>();
}

function isPro(key: string) {
  return !key.endsWith(":fx");
}

const DEEPL_QUOTA_EXCEEDED = 456;

function gotErrorToString(error: unknown) {
  // response received
  if (error instanceof got.HTTPError) {
    const { statusCode } = error.response;
    if (statusCode === StatusCodes.FORBIDDEN) return "Invalid DeepL API key";
    if (statusCode === StatusCodes.TOO_MANY_REQUESTS) return "Too many requests to DeepL API";
    if (statusCode === DEEPL_QUOTA_EXCEEDED)
      return "DeepL API quota exceeded. The translation limit of your account has been reached. Consider upgrading your subscription.";
    if (statusCode.toString().startsWith("5")) return "DeepL API is temporary unavailable. Please try again later.";

    return `DeepL API returned ${statusCode} ${getReasonPhrase(statusCode)}`;
  }

  // request failed
  if (error instanceof got.RequestError)
    return `Something went wrong when sending a request to the DeepL API. If you’re having issues, open an issue on GitHub and include following text: ${error.code} ${error.message}`;

  return "Unknown error";
}

export async function sendTranslateRequest({
  text: initialText,
  sourceLanguage,
  targetLanguage,
}: {
  text?: string;
  sourceLanguage?: SourceLanguage;
  targetLanguage: TargetLanguage;
}) {
  try {
    const text = initialText || (await getSelectedText());

    const { key, onTranslateAction } = getPreferences();

    try {
      const {
        translations: [{ text: translation, detected_source_language: detectedSourceLanguage }],
      } = await got
        .post(`https://api${isPro(key) ? "" : "-free"}.deepl.com/v2/translate`, {
          headers: {
            Authorization: `DeepL-Auth-Key ${key}`,
          },
          json: {
            text: [text],
            source_lang: sourceLanguage,
            target_lang: targetLanguage,
          },
        })
        .json<{ translations: { text: string; detected_source_language: SourceLanguage }[] }>();
      switch (onTranslateAction) {
        case "clipboard":
          await Clipboard.copy(translation);
          await showToast(Toast.Style.Success, "The translation was copied to your clipboard.");
          break;
        case "view":
          await launchCommand({
            name: "index",
            type: LaunchType.UserInitiated,
            context: {
              translation,
              sourceLanguage: detectedSourceLanguage,
            },
          });
          break;
        default:
          break;
      }

      return { translation, detectedSourceLanguage };
    } catch (error) {
      await showToast(Toast.Style.Failure, "Something went wrong", gotErrorToString(error));
    }
  } catch (error) {
    await showToast(Toast.Style.Failure, "Please select the text to be translated");
  }
}

export async function translate(target: TargetLanguage) {
  await sendTranslateRequest({ targetLanguage: target });
}

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
  ID: "Indonesian",
  KO: "Korean",
  NB: "Norwegian (Bokmål)",
  TR: "Turkish",
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
  ID: "Indonesian",
  KO: "Korean",
  NB: "Norwegian (Bokmål)",
  TR: "Turkish",
};
export type TargetLanguage = keyof typeof target_languages;
