import { format } from "prettier";
import { transformer } from "../helpers";
import { Util } from "../interfaces";

const formatScss: Util = {
  name: "Format SCSS",
  icon: "css_icon.png",
  description: "Cleans and formats SCSS using prettier",
  inputType: "textarea",
  transform: transformer((s: string) => {
    return format(s, { parser: "scss" });
  }),
};

export default formatScss;
