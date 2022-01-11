import { transformer } from "../helpers";
import { Util } from "../interfaces";

const convertUppercase: Util = {
  name: "Convert to uppercase",
  icon: "uppercase_icon.png",
  description: "Converts text to uppercase",
  inputType: "textarea",
  transform: transformer((s: string) => {
    return s.toLocaleUpperCase();
  }),
};

export default convertUppercase;
