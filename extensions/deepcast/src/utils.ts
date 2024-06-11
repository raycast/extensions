import {
  getSelectedText,
  Clipboard,
  Toast,
  showToast,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  closeMainWindow,
} from "@raycast/api";
import got, { HTTPError, RequestError } from "got";
import { StatusCodes, getReasonPhrase } from "http-status-codes";

function isPro(key: string) {
  return !key.endsWith(":fx");
}

const DEEPL_QUOTA_EXCEEDED = 456;

function gotErrorToString(error: unknown) {
  console.log(error);
  // response received
  if (error instanceof HTTPError) {
    const { statusCode } = error.response;
    if (statusCode === StatusCodes.FORBIDDEN) return "Invalid DeepL API key";
    if (statusCode === StatusCodes.TOO_MANY_REQUESTS) return "Too many requests to DeepL API";
    if (statusCode === DEEPL_QUOTA_EXCEEDED)
      return "DeepL API quota exceeded. The translation limit of your account has been reached. Consider upgrading your subscription.";
    if (statusCode.toString().startsWith("5")) return "DeepL API is temporary unavailable. Please try again later.";

    return `DeepL API returned ${statusCode} ${getReasonPhrase(statusCode)}`;
  }

  // request failed
  if (error instanceof RequestError) {
    return `Something went wrong when sending a request to the DeepL API. If you’re having issues, open an issue on GitHub and include following text: ${error.code} ${error.message}`;
  }
  return "Unknown error";
}

export async function getSelection() {
  try {
    return await getSelectedText();
  } catch (error) {
    return "";
  }
}

// Get the text, matching preferences.
// If selected text is the preferred source, it will try selected text but fallback to clipboard.
// If clipboard is the preferred source, it will try clipboard but fallback to selected text.
export async function readContent() {
  const preferredSource = getPreferenceValues<Preferences>().source;
  const clipboard = await Clipboard.readText();
  const selected = await getSelection();

  if (preferredSource === "clipboard") {
    return clipboard || selected;
  } else {
    return selected || clipboard;
  }
}

export async function sendTranslateRequest({
  text: initialText,
  sourceLanguage,
  targetLanguage,
  onTranslateAction,
}: {
  text?: string;
  sourceLanguage?: SourceLanguage;
  targetLanguage: TargetLanguage;
  onTranslateAction?: Preferences["onTranslateAction"] | "none";
}) {
  try {
    const prefs = getPreferenceValues<Preferences>();
    const { key } = prefs;
    onTranslateAction ??= prefs.onTranslateAction;

    const text = initialText || (await readContent());

    const toast = await showToast(Toast.Style.Animated, "Fetching translation...");

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
          try {
            await launchCommand({
              name: "index",
              type: LaunchType.UserInitiated,
              context: {
                translation,
                sourceLanguage: detectedSourceLanguage,
              },
            });
          } catch {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to display translated text.",
              message: "The main Translate command must be enabled.",
            });
          }
          break;
        case "paste":
          await closeMainWindow();
          await Clipboard.paste(translation);
          break;
        default:
          toast.hide();
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

export async function translate(target: TargetLanguage, text?: string) {
  await sendTranslateRequest({ targetLanguage: target, text: text });
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
