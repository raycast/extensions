import { format } from "prettier";
import { transformer } from "../helpers";
import { Util } from "../interfaces";

const formatMdx: Util = {
  name: "Format MDX",
  icon: "markdown_icon.png",
  description: "Cleans and formats MDX using prettier",
  inputType: "textarea",
  transform: transformer((s: string) => {
    return format(s, { parser: "mdx" });
  }),
};

export default formatMdx;
