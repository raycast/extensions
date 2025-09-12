import { LocalStorage } from "@raycast/api";
import { translationPrompt } from "../constants/prompts";

type Input = {
  /** The description for the input property */
  vocabulary: string;
};

export default async function translateVocabulary(input: Input) {
  const { vocabulary } = input;
  const nativeLanguage: string = (await LocalStorage.getItem("native-language")) || "";
  return translationPrompt.replaceAll("[[vocabulary]]", vocabulary).replaceAll("[[nativeLanguage]]", nativeLanguage);
}
