import { Script } from "../type";

export const urlEncode: Script = {
  info: {
    title: "URL Encode",
    desc: "Encode URL entities in your text",
    type: ["list", "form", "clipboard"],
    example: "https://www.raycast.com",
  },
  run(input) {
    return encodeURIComponent(input);
  },
};

export const urlDecode: Script = {
  info: {
    title: "URL Decode",
    desc: "Decode URL entities in your text",
    type: ["list", "form", "clipboard"],
    example: "https%3A%2F%2Fwww.raycast.com",
  },
  run(input) {
    return decodeURIComponent(input);
  },
};
