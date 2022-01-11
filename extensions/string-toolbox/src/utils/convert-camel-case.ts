import { camelCase } from "lodash";
import { transformer } from "../helpers";
import { Util } from "../interfaces";

const convertCamelCase: Util = {
  name: "Convert to camelCase",
  icon: "camel_icon.png",
  description: "From __FOO_BAR__ to fooBar",
  inputType: "textfield",
  transform: transformer((s: string) => {
    return camelCase(s);
  }),
};

export default convertCamelCase;
