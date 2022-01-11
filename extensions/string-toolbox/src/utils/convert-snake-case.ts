import { snakeCase } from "lodash";
import { transformer } from "../helpers";
import { Util } from "../interfaces";

const convertSnakeCase: Util = {
  name: "Convert to snake-case",
  icon: "snake_icon.png",
  description: "From __FOO_BAR__ to foo-bar",
  inputType: "textfield",
  transform: transformer((s: string) => {
    return snakeCase(s);
  }),
};

export default convertSnakeCase;
