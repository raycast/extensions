import { Script } from "../type";

/* export default <Script>{
  info: { title: "Test", desc: "Test" },
  run(input) {
    return input;
  },
}; */

export const Trim: Script = {
  info: {
    title: "Trim",
    desc: "Trims leading and trailing whitespace.",
    keywords: ["trim", "whitespace", "empty", "space"],
  },
  run(input) {
    return input.trim();
  },
};
