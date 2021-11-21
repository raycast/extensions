import { Script } from "../type";
import * as _ from "lodash";

export const CamelCase: Script = {
  info: { title: "CamelCase", desc: "Converts Your Text To CamelCase", type: "all", example: "ray cast" },
  run(input) {
    return _.camelCase(input);
  },
};
