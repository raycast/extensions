import { format } from "prettier";
import { transformer } from "../helpers";
import { Util } from "../interfaces";

const formatMarkdown: Util = {
  name: "Format Markdown",
  icon: "markdown_icon.png",
  description: "Cleans and formats Markdown & GitHub Flavored Markdown using prettier",
  inputType: "textarea",
  transform: transformer((s: string) => {
    return format(s, { parser: "markdown" });
  }),
};

export default formatMarkdown;
