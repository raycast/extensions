import { Script } from "../type";
import vkbeautify from "vkbeautify";

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
      return vkbeautify.json(input, 2);
    } catch (error) {
      throw Error("Invalid JSON");
    }
  },
};

export const minifyJson: Script = {
  info: {
    title: "Minify JSON",
    desc: "Cleans and minifies JSON documents",
    type: ["form", "clipboard"],
    example: '{"photos": {"total": 10000,"total_pages": 910}}',
  },
  run(input) {
    try {
      return vkbeautify.jsonmin(input);
    } catch (error) {
      throw Error("Invalid JSON");
    }
  },
};

export const escapeJson: Script = {
  info: {
    title: "Escape JSON",
    desc: "Escapes JSON",
    type: ["form", "clipboard"],
    example: '{"photos": {"total": 10000,"total_pages": 910}}',
  },
  run(input) {
    try {
      return JSON.stringify(input);
    } catch (error) {
      throw Error("Invalid JSON");
    }
  },
};

export const unescapeJson: Script = {
  info: {
    title: "Unescape JSON",
    desc: "Unescapes JSON",
    type: ["form", "clipboard"],
    example: '"{\\"photos\\": {\\"total\\": 10000,\\"total_pages\\": 910}}"',
  },
  run(input) {
    try {
      return JSON.parse(input);
    } catch (error) {
      throw Error("Invalid JSON");
    }
  },
};
