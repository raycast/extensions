import { Transformation } from "./types";
import { splitIntoWords } from "../utils/string-utils";

export const snakecase: Transformation = {
  id: "snakecase",
  name: "snake_case",
  description: "Convert to snake_case",
  icon: "minus",
  transform: (text) => {
    const words = splitIntoWords(text);
    return words.map((word) => word.toLowerCase()).join("_");
  },
  preferenceKey: "enableSnakeCase",
};
