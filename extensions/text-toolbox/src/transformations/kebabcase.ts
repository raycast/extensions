import { Transformation } from "./types";
import { splitIntoWords } from "../utils/string-utils";

export const kebabcase: Transformation = {
  id: "kebabcase",
  name: "kebab-case",
  description: "Convert to kebab-case",
  icon: "minus",
  transform: (text) => {
    const words = splitIntoWords(text);
    return words.map((word) => word.toLowerCase()).join("-");
  },
  preferenceKey: "enableKebabCase",
};
