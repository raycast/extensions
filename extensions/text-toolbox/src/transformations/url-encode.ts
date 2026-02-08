import { Transformation } from "./types";

export const urlEncode: Transformation = {
  id: "url-encode",
  name: "URL Encode",
  description: "Escape URL unsafe characters",
  icon: "link",
  transform: (text) => encodeURIComponent(text),
  preferenceKey: "enableUrlEncode",
};
