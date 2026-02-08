import { Transformation } from "./types";
import { splitIntoWords } from "../utils/string-utils";

export const pascalcase: Transformation = {
  id: "pascalcase",
  name: "PascalCase",
  description: "Convert to PascalCase",
  icon: "text-cursor",
  transform: (text) => {
    const words = splitIntoWords(text);
    return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
  },
  preferenceKey: "enablePascalCase",
};
