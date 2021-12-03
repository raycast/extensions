import { Script } from "../type";

export const foramtJson: Script = {
  info: {
    title: "Format JSON",
    desc: "Format JSON documents",
    type: ["form", "clipboard"],
    keywords: ["prettify"],
    example: '{"photos": {"total": 10000,"total_pages": 910}}',
  },
  run(input) {
    try {
      return JSON.stringify(JSON.parse(input), null, 2);
    } catch (error) {
      throw Error("Invalid JSON");
    }
  },
};
