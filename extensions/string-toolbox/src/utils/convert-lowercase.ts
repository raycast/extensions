import { transformer } from "../helpers";
import { Util } from "../interfaces";

const convertLowercase: Util = {
  name: "Convert to lowercase",
  icon: "lowercase_icon.png",
  description: "Converts text to lowercase",
  inputType: "textarea",
  transform: transformer((s: string) => {
    return s.toLocaleLowerCase();
  }),
};

export default convertLowercase;
