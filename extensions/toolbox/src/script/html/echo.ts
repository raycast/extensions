import { Script } from "../type";

export const echo: Script = {
  info: { title: "html2222", desc: "Input echo" },
  run(input) {
    return input + "html2222";
  },
};
