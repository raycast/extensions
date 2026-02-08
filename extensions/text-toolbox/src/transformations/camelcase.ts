import { Transformation } from "./types";
import { splitIntoWords } from "../utils/string-utils";

export const camelcase: Transformation = {
  id: "camelcase",
  name: "camelCase",
  description: "Convert to camelCase",
  icon: "text-cursor",
  transform: (text) => {
    const words = splitIntoWords(text);
    if (words.length === 0) return text;
    return (
      words[0].toLowerCase() +
      words
        .slice(1)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join("")
    );
  },
  preferenceKey: "enableCamelCase",
};
