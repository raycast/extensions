import { Transformation } from "./types";

export const removeExtraSpaces: Transformation = {
  id: "remove-extra-spaces",
  name: "Remove Extra Spaces",
  description: "Collapse multiple spaces to single space",
  icon: "eraser",
  transform: (text) => text.replace(/\s+/g, " ").trim(),
  preferenceKey: "enableRemoveExtraSpaces",
};
