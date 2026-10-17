import { Script } from "../type";
import vkbeautify from "vkbeautify";

export const formatXml: Script = {
  info: {
    title: "Format XML/HTML",
    desc: "Format XML/HTML documents",
    type: ["form", "clipboard"],
    keywords: ["prettify"],
    example: '<?xml version="1.0" encoding="UTF-8"><a><b>bbb</b><f>fff</f></a>',
  },
  run(input) {
    try {
      return vkbeautify.xml(input);
    } catch {
      throw Error("Invalid XML/HTML");
    }
  },
};

export const minifyXml: Script = {
  info: {
    title: "Minify XML/HTML",
    desc: "Cleans and minifies XML/HTML documents",
    type: ["form", "clipboard"],
    example: '<?xml version="1.0" encoding="UTF-8"><a><b>bbb</b><f>fff</f></a>',
  },
  run(input) {
    try {
      return vkbeautify.xmlmin(input);
    } catch {
      throw Error("Invalid XML/HTML");
    }
  },
};
