import type { Config } from "@svgr/core";
import type { OptimizeOptions } from "svgo";

export const SVGR_DEFAULT: Config = {
  dimensions: true,
  icon: true,
  memo: false,
  native: false,
  ref: false,
  svgo: false,
  titleProp: false,
  typescript: false,
  expandProps: "end",
  exportType: "named",
  jsxRuntime: "classic",
};

export const SVGO_DEFAULT: OptimizeOptions = {
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          removeTitle: false,
        },
      },
    },
  ],
};
