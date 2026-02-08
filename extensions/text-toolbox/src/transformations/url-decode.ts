import { Transformation } from "./types";

export const urlDecode: Transformation = {
  id: "url-decode",
  name: "URL Decode",
  description: "Unescape URL encoded characters",
  icon: "link",
  transform: (text) => {
    try {
      return decodeURIComponent(text);
    } catch {
      return "Error: Invalid URL-encoded input";
    }
  },
  preferenceKey: "enableUrlDecode",
};
