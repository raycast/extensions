import { Transformation } from "./types";

export const lowercase: Transformation = {
  id: "lowercase",
  name: "Lower Case",
  description: "Convert to lowercase",
  icon: "arrow-down-circle",
  transform: (text) => text.toLowerCase(),
  preferenceKey: "enableLowerCase",
};
