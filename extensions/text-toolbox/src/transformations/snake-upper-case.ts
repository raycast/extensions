import { Transformation } from "./types";
import { splitIntoWords } from "../utils/string-utils";

export const snakeUpperCase: Transformation = {
  id: "snake-upper-case",
  name: "SNAKE_UPPER_CASE",
  description: "Convert to SNAKE_UPPER_CASE",
  icon: "hashtag",
  transform: (text) => {
    const words = splitIntoWords(text);
    return words.map((word) => word.toUpperCase()).join("_");
  },
  preferenceKey: "enableSnakeUpperCase",
};
