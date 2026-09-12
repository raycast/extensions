import { Script } from "../type";
import { reverse } from "esrever";

export const reverseLines: Script = {
  info: {
    title: "Reverse Lines",
    desc: "Flips every line of your text",
    type: ["form", "clipboard"],
    keywords: ["flip", "mirror", "invert"],
    example: "aaa bbb ccc ddd eee",
  },
  run(input) {
    return reverse(input);
  },
};

export const reverseString: Script = {
  info: {
    title: "Reverse String",
    desc: "Flips of your text",
    type: ["list", "form", "clipboard"],
    keywords: ["flip", "mirror", "invert"],
    example: "aaa bbb ccc ddd eee",
  },
  run(input) {
    return reverse(input);
  },
};
