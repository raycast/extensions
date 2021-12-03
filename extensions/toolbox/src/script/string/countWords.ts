import { Script } from "../type";

export const countWords: Script = {
  info: {
    title: "Count Words",
    desc: "Get the word count of your text",
    type: "all",
    example: "ray cast",
  },
  run(input) {
    if (input.trim().match(/\S+/g)) {
      return String(input.trim().match(/\S+/g)?.length);
    } else {
      throw Error("No Word");
    }
  },
};
