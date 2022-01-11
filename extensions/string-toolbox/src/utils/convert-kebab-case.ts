import { kebabCase } from "lodash";
import { transformer } from "../helpers";
import { Util } from "../interfaces";

const convertKebabCase: Util = {
  name: "Convert to kebab-case",
  icon: "kebab_icon.png",
  description: "From __FOO_BAR__ to foo-bar",
  inputType: "textfield",
  transform: transformer((s: string) => {
    return kebabCase(s);
  }),
};

export default convertKebabCase;
