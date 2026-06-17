import { GoogleTranslation, translationSchema, translitSchema } from "./googleTranslationSchema";
import { z } from "zod";
export declare function shortHash(str: string): string;
export declare const createTranslationKey: (fromTo: string, text: string) => string;
export declare const getTranslatedSentence: (
  sentence: GoogleTranslation["sentences"],
) => z.infer<typeof translationSchema>;
export declare const getTranslitSentence: (sentence: GoogleTranslation["sentences"]) => z.infer<typeof translitSchema>;
