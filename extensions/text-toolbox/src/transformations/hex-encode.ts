import { Transformation } from "./types";

export const hexEncode: Transformation = {
  id: "hex-encode",
  name: "Hex Encode",
  description: "Convert text to hexadecimal",
  icon: "hashtag",
  transform: (text) => {
    return (
      Buffer.from(text, "utf-8")
        .toString("hex")
        .match(/.{1,2}/g)
        ?.join(" ") || ""
    );
  },
  preferenceKey: "enableHexEncode",
};
