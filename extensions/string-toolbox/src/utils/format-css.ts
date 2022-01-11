import { format } from "prettier";
import { transformer } from "../helpers";
import { Util } from "../interfaces";

const formatCss: Util = {
  name: "Format CSS",
  icon: "css_icon.png",
  description: "Cleans and formats CSS using prettier",
  inputType: "textarea",
  transform: transformer((s: string) => {
    return format(s, { parser: "css" });
  }),
};

export default formatCss;
