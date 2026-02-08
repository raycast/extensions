import { Transformation } from "./types";

export const reverseLines: Transformation = {
  id: "reverse-lines",
  name: "Reverse Lines",
  description: "Reverse line order",
  icon: "arrow-up-arrow-down",
  transform: (text) => {
    const lines = text.split("\n");
    return lines.reverse().join("\n");
  },
  preferenceKey: "enableReverseLines",
};
