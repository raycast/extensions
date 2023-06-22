import postcssJs from "postcss-js";
import postcss from "postcss";

export const TransformCSSToJS = {
  from: "CSS",
  to: "JS",
  transform: (value: string) => {
    const css = postcss.parse(value);
    return JSON.stringify(postcssJs.objectify(css), null, 2);
  },
};
