import { Script } from "../type";

/* export default <Script>{
  info: { title: "Test", desc: "Test" },
  run(input) {
    return input;
  },
}; */

export const trim: Script = {
  info: {
    title: "Trim",
    desc: "Trims leading and trailing whitespace",
    type: "all",
    keywords: ["whitespace", "empty", "space"],
    example: "    ray cat     ",
  },
  run(input) {
    return input.trim();
  },
};
