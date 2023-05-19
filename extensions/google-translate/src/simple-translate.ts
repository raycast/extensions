import translate from "@iamtraction/google-translate";
import { LanguageCode } from "./languages";

export const AUTO_DETECT = "auto";

export type SimpleTranslateResult = {
  originalText: string;
  translatedText: string;
  langFrom: LanguageCode;
  langTo: LanguageCode;
};

export class TranslateError extends Error {}

export async function simpleTranslate(
  text: string,
  options: { langFrom: LanguageCode; langTo: LanguageCode }
): Promise<SimpleTranslateResult> {
  try {
    const translated = await translate(text, {
      from: options.langFrom,
      to: options.langTo,
    });

    return {
      originalText: text,
      translatedText: translated.text,
      langFrom: translated?.from?.language?.iso as LanguageCode,
      langTo: options.langTo,
    };
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "TooManyRequestsError") {
        const error = new TranslateError();
        error.name = "Too many requests";
        error.message = "please try again later";
        throw error;
      }

      const error = new TranslateError();
      error.name = err.name;
      error.message = err.message;
      throw error;
    }

    throw err;
  }
}
