import { googleTranslationSchema, GoogleTranslation } from "./googleTranslationSchema";
import { createTranslationKey, getTranslatedSentence, getTranslitSentence } from "./utils";
export declare const translate: (
  from: string,
  to: string,
  text: string,
  context?: string,
) => Promise<TranslatedText | null>;
type TranslatedText = {
  translation: GoogleTranslation & {
    aiTranslation?: {
      translation: string;
      collocationWords: string;
      collocationWordsTranslation?: string;
    };
  };
  context: string;
  text: string;
  timestamp: number;
  fromTo: string;
  hashKey: string;
};
export type { GoogleTranslation, TranslatedText };
export { googleTranslationSchema, createTranslationKey, getTranslatedSentence, getTranslitSentence };
