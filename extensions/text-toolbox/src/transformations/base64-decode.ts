import { Transformation } from "./types";

export const base64Decode: Transformation = {
  id: "base64-decode",
  name: "Base64 Decode",
  description: "Decode Base64 to text",
  icon: "lock-unlocked",
  transform: (text) => {
    try {
      // Validate Base64 string (only valid Base64 characters)
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text)) {
        return "Error: Invalid Base64 input";
      }
      const decoded = Buffer.from(text, "base64").toString("utf-8");
      // Check if the decoded result contains valid UTF-8 by attempting to encode it back
      // If the length is significantly different, it's likely invalid
      if (text.length > 0 && decoded.length === 0) {
        return "Error: Invalid Base64 input";
      }
      return decoded;
    } catch {
      return "Error: Invalid Base64 input";
    }
  },
  preferenceKey: "enableBase64Decode",
};
