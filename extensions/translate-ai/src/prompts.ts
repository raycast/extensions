import { type TargetLanguage, LANGUAGES } from "./types";

export function getTranslationPrompt(text: string, lang: TargetLanguage): string {
  const language = LANGUAGES.find((l) => l.code === lang)!.name;

  return `Detect the source language automatically and translate the following text to ${language}.
If the text is already in ${language}, return it unchanged.
Return only the translation or original text,
without any explanations or additional text:

${text}`;
}
