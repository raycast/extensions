import type { Config } from "@svgr/core";

export const svgrDefaultSettings: Config = {
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
export const svgoDefaultSettings = {};
