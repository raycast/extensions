import { format } from "prettier";
import { transformer } from "../helpers";
import { Util } from "../interfaces";

const formatHtml: Util = {
  name: "Format HTML",
  icon: "html_icon.png",
  description: "Cleans and formats HTML using prettier",
  inputType: "textarea",
  transform: transformer((s: string) => {
    return format(s, { parser: "html" });
  }),
};

export default formatHtml;
