import { Script } from "../type";
import * as _ from "lodash";

export const CountWords: Script = {
  info: {
    title: "Count Words",
    desc: "Get the word count of your text",
    type: "all",
    example: "ray cast",
  },
  run(input) {
    return String(input.trim().match(/\S+/g)?.length);
  },
};
