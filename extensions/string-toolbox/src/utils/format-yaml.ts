import { format } from "prettier";
import { transformer } from "../helpers";
import { Util } from "../interfaces";

const formatYaml: Util = {
  name: "Format YAML",
  icon: "yaml_icon.png",
  description: "Cleans and formats YAML using prettier",
  inputType: "textarea",
  transform: transformer((s: string) => {
    return format(s, { parser: "yaml" });
  }),
};

export default formatYaml;
