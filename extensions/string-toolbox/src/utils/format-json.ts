import { format } from "prettier";
import { transformer } from "../helpers";
import { Util } from "../interfaces";

const formatJson: Util = {
  name: "Format JSON",
  icon: "json_icon.png",
  description: "Cleans and formats JSON using prettier",
  inputType: "textarea",
  transform: transformer((s: string) => {
    return format(s, { parser: "json" });
  }),
};

export default formatJson;
