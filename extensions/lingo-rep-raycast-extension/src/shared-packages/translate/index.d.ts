import { googleTranslationSchema, GoogleTranslation } from "./googleTranslationSchema";
import { createTranslationKey } from "./utils";
export declare const translate: (from: string, to: string, text: string) => Promise<TranslatedText | null>;
type TranslatedText = {
  translation: GoogleTranslation;
  timestamp: number;
  fromTo: string;
  hashKey: string;
};
export type { GoogleTranslation, TranslatedText };
export { googleTranslationSchema, createTranslationKey };
