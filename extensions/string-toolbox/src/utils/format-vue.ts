import { format } from "prettier";
import { transformer } from "../helpers";
import { Util } from "../interfaces";

const formatVue: Util = {
  name: "Format Vue",
  icon: "vue_icon.png",
  description: "Cleans and formats VueJS code using prettier",
  inputType: "textarea",
  transform: transformer((s: string) => {
    return format(s, { parser: "vue" });
  }),
};

export default formatVue;
