import translate from "@iamtraction/google-translate";
import { LanguageCode } from "./languages";
import { LanguageCodeSet } from "./types";

export const AUTO_DETECT = "auto";

export type SimpleTranslateResult = {
  originalText: string;
  translatedText: string;
  langFrom: LanguageCode;
  langTo: LanguageCode;
};

export class TranslateError extends Error {}

export async function simpleTranslate(text: string, options: LanguageCodeSet): Promise<SimpleTranslateResult> {
  try {
    if (!text) {
      return {
        originalText: text,
        translatedText: "",
        langFrom: options.langFrom,
        langTo: options.langTo,
      };
    }

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

export async function doubleWayTranslate(text: string, options: LanguageCodeSet) {
  if (!text) {
    return [];
  }

  if (options.langFrom === AUTO_DETECT) {
    const translated1 = await simpleTranslate(text, {
      langFrom: options.langFrom,
      langTo: options.langTo,
    });

    if (translated1?.langFrom) {
      const translated2 = await simpleTranslate(translated1.translatedText, {
        langFrom: options.langTo,
        langTo: translated1.langFrom,
      });

      return [translated1, translated2];
    }

    return [];
  } else {
    return await Promise.all([
      simpleTranslate(text, {
        langFrom: options.langFrom,
        langTo: options.langTo,
      }),
      simpleTranslate(text, {
        langFrom: options.langTo,
        langTo: options.langFrom,
      }),
    ]);
  }
}
