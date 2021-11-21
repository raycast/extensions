import { Script } from "../type";

export const URLEncode: Script = {
  info: {
    title: "URL Encode",
    desc: "Encodes URL entities in your text",
    type: "all",
    example: "https://www.raycast.com",
  },
  run(input) {
    return encodeURIComponent(input);
  },
};

export const URLDecode: Script = {
  info: {
    title: "URL Decode",
    desc: "Decodes URL entities in your text",
    type: "all",
    example: "https%3A%2F%2Fwww.raycast.com",
  },
  run(input) {
    return decodeURIComponent(input);
  },
};
