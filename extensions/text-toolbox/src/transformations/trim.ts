import { Transformation } from "./types";

export const trim: Transformation = {
  id: "trim",
  name: "Trim",
  description: "Remove leading/trailing whitespace",
  icon: "eraser",
  transform: (text) => text.trim(),
  preferenceKey: "enableTrim",
};
