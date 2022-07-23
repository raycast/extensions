import { Script } from "../type";

export const base64Encode: Script = {
  info: {
    title: "Base64 Encode",
    desc: "Encode your text into Base64",
    type: ["list", "form", "clipboard"],
    example: "https://www.raycast.com",
  },
  run(input) {
    return Buffer.from(input, "utf8").toString("base64");
  },
};

export const base64Decode: Script = {
  info: {
    title: "Base64 Decode",
    desc: "Decode your text from Base64",
    type: ["list", "form", "clipboard"],
    example: "aHR0cHM6Ly93d3cucmF5Y2FzdC5jb20=",
  },
  run(input) {
    return Buffer.from(input, "base64").toString("utf8");
  },
};
