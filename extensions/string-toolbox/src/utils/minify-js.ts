import { minify } from "terser";
import { transformer } from "../helpers";
import { Util } from "../interfaces";

const minifyJs: Util = {
  name: "Minify JavaScript",
  icon: "js_icon.png",
  description: "Cleans and minifies JavaScript using terser",
  inputType: "textarea",
  transform: transformer(async (s: string) => {
    const result = await minify(s, { sourceMap: false });
    return result?.code || "";
  }),
};

export default minifyJs;
