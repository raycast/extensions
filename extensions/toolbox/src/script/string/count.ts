import { Script } from "../type";
import { size } from "lodash";

export const countWords: Script = {
  info: {
    title: "Count Words",
    desc: "Get the word count of your text",
    type: ["list", "form", "clipboard"],
    example: "ray cast",
  },
  run(input) {
    if (input.trim().match(/\S+/g)) {
      return String(input.trim().match(/\S+/g)?.length);
    } else {
      throw Error("Invalid Word");
    }
  },
};

export const countLines: Script = {
  info: {
    title: "Count Lines",
    desc: "Get the line count of your text",
    type: ["form", "clipboard"],
    example: "ray\ncast",
  },
  run(input) {
    return String(input.split("\n").length);
  },
};

export const countCharacters: Script = {
  info: {
    title: "Count Characters",
    desc: "Get the length of your text",
    type: ["list", "form", "clipboard"],
    example: "raycast",
  },
  run(input) {
    return String(size(input));
  },
};
