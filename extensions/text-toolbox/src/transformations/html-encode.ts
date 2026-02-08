import { Transformation } from "./types";

export const htmlEncode: Transformation = {
  id: "html-encode",
  name: "HTML Encode",
  description: "Encode HTML entities (&, <, >, \", ')",
  icon: "code",
  transform: (text) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },
  preferenceKey: "enableHtmlEncode",
};
