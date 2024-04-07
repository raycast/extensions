import { englishToThaiCharMap } from "./en-th-map";
import { thaiToEnglishCharMap } from "./th-en-map";

const checkLang = (char: string): "th" | "en" => {
  return thaiToEnglishCharMap[char] ? "th" : "en";
};

export const mapCharacters = (text: string) => {
  const splittedText = text.split("");

  if (!splittedText.length) return "";

  const lang = checkLang(splittedText[0]);

  if (lang === "th") {
    return splittedText.map((t) => thaiToEnglishCharMap[t] ?? " ").join("");
  }

  return splittedText.map((t) => englishToThaiCharMap[t] ?? " ").join("");
};
