import { Script } from "../type";
import * as _ from "lodash";

export const camelCase: Script = {
  info: { title: "Camel Case", desc: "Converts Your Text To Camel Case", type: "all", example: "ray cast" },
  run(input) {
    return _.camelCase(input);
  },
};
