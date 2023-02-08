import translate from "@vitalets/google-translate-api";
import { LanguageCode } from "./languages";

export const AUTO_DETECT = "auto";

export type SimpleTranslateResult = {
  originalText: string;
  translatedText: string;
  pronunciation: string;
  langFrom: LanguageCode;
  langTo: LanguageCode;
};

export async function simpleTranslate(
  text: string,
  options: { langFrom: LanguageCode; langTo: LanguageCode }
): Promise<SimpleTranslateResult> {
  const isAutoDetect = options.langFrom === AUTO_DETECT;
  const translated = await translate(text, {
    from: isAutoDetect ? undefined : options.langFrom,
    to: options.langTo,
  });

  return {
    originalText: text,
    translatedText: translated.text,
    pronunciation: translated.pronunciation,
    langFrom: isAutoDetect ? (translated?.from?.language?.iso as LanguageCode) : options.langFrom,
    langTo: options.langTo,
  };
}
