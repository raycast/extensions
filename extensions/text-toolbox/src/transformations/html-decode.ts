import { Transformation } from "./types";

export const htmlDecode: Transformation = {
  id: "html-decode",
  name: "HTML Decode",
  description: "Decode HTML entities to characters",
  icon: "code",
  transform: (text) => {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  },
  preferenceKey: "enableHtmlDecode",
};
