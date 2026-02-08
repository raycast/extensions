import { Transformation } from "./types";

export const capitalizeEachWord: Transformation = {
  id: "capitalize-each-word",
  name: "Capitalize Each Word",
  description: "Capitalize the first letter of each word",
  icon: "text-cursor",
  transform: (text) => {
    return text.replace(/\b\w/g, (char) => char.toUpperCase());
  },
  preferenceKey: "enableCapitalizeEachWord",
};
