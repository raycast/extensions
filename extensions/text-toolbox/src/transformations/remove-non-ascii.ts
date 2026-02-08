import { Transformation } from "./types";

export const removeNonAscii: Transformation = {
  id: "remove-non-ascii",
  name: "Remove Non-ASCII",
  description: "Remove all non-ASCII characters",
  icon: "eraser",
  transform: (text) =>
    text
      .split("")
      .filter((char) => char.charCodeAt(0) <= 127)
      .join(""),
  preferenceKey: "enableRemoveNonAscii",
};
