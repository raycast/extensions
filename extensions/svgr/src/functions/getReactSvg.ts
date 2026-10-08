import { readFileSync } from "fs";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { Config, transform } from "@svgr/core";
import jsx from "@svgr/plugin-jsx";
import svgoPlugin from "@svgr/plugin-svgo";
import { SVGO_DEFAULT, SVGR_DEFAULT } from "../constants";

import type { OptimizeOptions } from "svgo";
import type { SvgrProps } from "../index";

const getSettings = async (svgoConfigPath: string) => {
  const svgrJSON = await LocalStorage.getItem("svgr");
  const svgrSettings: Config = typeof svgrJSON === "string" ? JSON.parse(svgrJSON) : SVGR_DEFAULT;
  const svgoJSON = readFileSync(svgoConfigPath);
  const svgoConfig: OptimizeOptions = typeof svgoJSON === "string" ? JSON.parse(svgoJSON) : SVGO_DEFAULT;
  return {
    svgrSettings,
    svgoConfig,
  };
};

interface GetReactSvgProps extends SvgrProps {
  svgoConfigPath: string;
}

const getReactSVG = async ({ svg, componentName, svgoConfigPath }: GetReactSvgProps) => {
  const { svgrSettings, svgoConfig } = await getSettings(svgoConfigPath);
  const plugins = svgrSettings.svgo ? [svgoPlugin, jsx] : [jsx];
  try {
    return await transform(
      svg,
      {
        ...svgrSettings,
        plugins,
        svgoConfig,
      },
      { componentName }
    );
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "SVGR Conversion",
      message: "Failure: You've entered an invalid SVG.",
    });
    return null;
  }
};

export default getReactSVG;
