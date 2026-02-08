import { Transformation } from "./types";

export const hexDecode: Transformation = {
  id: "hex-decode",
  name: "Hex Decode",
  description: "Convert hexadecimal to text",
  icon: "hashtag",
  transform: (text) => {
    try {
      const hex = text.replace(/\s/g, "");
      // Validate hex string (must be even length and only contain hex characters)
      if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
        return "Error: Invalid hexadecimal input";
      }
      return Buffer.from(hex, "hex").toString("utf-8");
    } catch {
      return "Error: Invalid hexadecimal input";
    }
  },
  preferenceKey: "enableHexDecode",
};
