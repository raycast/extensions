import { format } from "prettier";
import { transformer } from "../helpers";
import { Util } from "../interfaces";

const formatJs: Util = {
  name: "Format JavaScript & TypeScript",
  icon: "js_icon.png",
  description: "Cleans and formats JS, JSX, TS, TSX using prettier",
  inputType: "textarea",
  transform: transformer((s: string) => {
    return format(s, { parser: "typescript" });
  }),
};

export default formatJs;
