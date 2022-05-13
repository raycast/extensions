import { transform } from "@svgr/core";
import jsx from "@svgr/plugin-jsx";
import svgoPlugin from "@svgr/plugin-svgo";
import type { Props } from "./index";

export const getReactSVG = async ({ svgo, svg, componentName }: Props) => {
  const plugins = [jsx];
  if (svgo) {
    plugins.unshift(svgoPlugin);
  }
  const reactSVG = await transform(svg, { plugins, typescript: true }, { componentName: componentName });
  return reactSVG;
};
