import { readFileSync } from "fs";
import { Config, transform } from "@svgr/core";
import jsx from "@svgr/plugin-jsx";
import svgoPlugin from "@svgr/plugin-svgo";
import { LocalStorage } from "@raycast/api";
import { svgoDefaultSettings, svgrDefaultSettings } from "./constants";

import type { Props } from "./index";

const getSettings = async (svgoConfigPath: string) => {
  const svgrJSON = await LocalStorage.getItem("svgr");
  const svgrSettings: Config = typeof svgrJSON === "string" ? JSON.parse(svgrJSON) : svgrDefaultSettings;
  const svgoJSON = readFileSync(svgoConfigPath);
  const svgoConfig = typeof svgoJSON === "string" ? JSON.parse(svgoJSON) : svgoDefaultSettings;
  return {
    svgrSettings,
    svgoConfig,
  };
};

interface GetReactSvgProps extends Props {
  svgoConfigPath: string;
}

export const getReactSVG = async ({ svg, componentName, svgoConfigPath }: GetReactSvgProps) => {
  const { svgrSettings, svgoConfig } = await getSettings(svgoConfigPath);
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
