import { Script } from "../type";
import vkbeautify from "vkbeautify";

export const foramtCss: Script = {
  info: {
    title: "Format CSS",
    desc: "Format CSS stylesheets",
    type: ["form", "clipboard"],
    keywords: ["prettify", "stylesheets"],
    example: ".headbg{margin:0 8px /*display:none*/ }",
  },
  run(input) {
    try {
      return vkbeautify.css(input, 2);
    } catch (error) {
      throw Error("Invalid CSS");
    }
  },
};

export const minifyCss: Script = {
  info: {
    title: "Minify CSS",
    desc: "Cleans and minifies CSS stylesheets",
    type: ["form", "clipboard"],
    example: ".headbg{margin:0 8px /*display:none*/ }",
  },
  run(input) {
    try {
      return vkbeautify.cssmin(input);
    } catch (error) {
      throw Error("Invalid CSS");
    }
  },
};
