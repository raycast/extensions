import { Transformation } from "./types";

export const uppercase: Transformation = {
  id: "uppercase",
  name: "Upper Case",
  description: "Convert to UPPERCASE",
  icon: "arrow-up-circle",
  transform: (text) => text.toUpperCase(),
  preferenceKey: "enableUpperCase",
};
