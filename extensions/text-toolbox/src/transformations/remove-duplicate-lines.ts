import { Transformation } from "./types";

export const removeDuplicateLines: Transformation = {
  id: "remove-duplicate-lines",
  name: "Remove Duplicate Lines",
  description: "Keep only unique lines",
  icon: "list-bullet",
  transform: (text) => {
    const lines = text.split("\n");
    const uniqueLines = [...new Set(lines)];
    return uniqueLines.join("\n");
  },
  preferenceKey: "enableRemoveDuplicateLines",
};
