import { Config, transform } from "@svgr/core";
import jsx from "@svgr/plugin-jsx";
import svgoPlugin from "@svgr/plugin-svgo";
import { LocalStorage } from "@raycast/api";
import { svgrDefaultSettings } from "./constants";
import svgoConfig from "../.svgorc.json";

import type { Props } from "./index";

const getSettings = async () => {
  const svgrJSON = await LocalStorage.getItem("svgr");
  const svgrSettings: Config = svgrJSON && typeof svgrJSON === "string" ? JSON.parse(svgrJSON) : svgrDefaultSettings;
  return {
    svgrSettings,
  };
};

export const getReactSVG = async ({ svg, componentName }: Props) => {
  const { svgrSettings } = await getSettings();
  const plugins = [jsx];
  if (svgrSettings.svgo) {
    plugins.unshift(svgoPlugin);
  }
  const reactSVG = await transform(
    svg,
    {
      ...svgrSettings,
      plugins,
      svgoConfig,
    },
    { componentName }
  );
  return reactSVG;
};
