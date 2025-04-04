import { LocalStorage } from "@raycast/api";
import { translationPrompt } from "../constants/prompts";
import { LanguageOption } from "./useLanguageList";

export const translateVocabularyPrompt = async (vocabulary: string, languageOptions: LanguageOption[]) => {
  const learningLanguageCode: string = (await LocalStorage.getItem("learning-language")) || "";
  const nativeLanguageCode: string = (await LocalStorage.getItem("native-language")) || "";
  const learningLanguage: string = languageOptions.find((option) => option.value === learningLanguageCode)?.label || "";
  const nativeLanguage: string = languageOptions.find((option) => option.value === nativeLanguageCode)?.label || "";

  return translationPrompt
    .replaceAll("[[vocabulary]]", vocabulary)
    .replaceAll("[[learningLanguage]]", learningLanguage)
    .replaceAll("[[nativeLanguage]]", nativeLanguage);
};
