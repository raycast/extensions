import { format } from "prettier";
import { transformer } from "../helpers";
import { Util } from "../interfaces";

const formatLess: Util = {
  name: "Format Less",
  icon: "less_icon.png",
  description: "Cleans and formats Less using prettier",
  inputType: "textarea",
  transform: transformer((s: string) => {
    return format(s, { parser: "less" });
  }),
};

export default formatLess;
