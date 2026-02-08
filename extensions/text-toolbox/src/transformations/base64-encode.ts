import { Transformation } from "./types";

export const base64Encode: Transformation = {
  id: "base64-encode",
  name: "Base64 Encode",
  description: "Encode text to Base64",
  icon: "lock",
  transform: (text) => Buffer.from(text, "utf-8").toString("base64"),
  preferenceKey: "enableBase64Encode",
};
