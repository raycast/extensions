import fs from "fs";
import path from "path";
import toml from "@ltd/j-toml";
import fetch from "node-fetch";
import { expandPath } from "../utils/path";
import { showFailureToast } from "@raycast/utils";
import { getAlacrittyPreferences } from "./get-alacritty-preferences";
import { AlacrittyConfig, LocalTheme, ExternalTheme } from "../types/theme-switcher";

/**
 * Get directory to download themes to, from the path of config file.
 */
const getThemeDirectory = (configFile: string) => expandPath(`${path.dirname(configFile)}/themes`);

/**
 * Get display name from file basename.
 *
 * @example
 * getDisplayName('solarized_dark.toml'); // Solarized dark
 */
export const getDisplayName = (basename: string) => {
  const filename = basename.replace(".toml", "");

  return filename
    .replaceAll(/[-_]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Read the current config file.
 */
export const readCurrentConfig = (): AlacrittyConfig | null => {
  try {
    return toml.parse(
      fs.readFileSync(expandPath(getAlacrittyPreferences().configFilePath), { encoding: "utf-8" })
    ) as AlacrittyConfig;
  } catch (e) {
    showFailureToast("Failed to read current config file.");
    return null;
  }
};

/**
 * From the current config file, attempt to read the theme being used.
 */
export const getCurrentTheme = (config: AlacrittyConfig | null): LocalTheme | null => {
  if (!config) {
    return null;
  }

  const file: string | undefined = (config.import || []).reverse().find((item) => /\/themes\//.test(item));
  if (!file) {
    return null;
  }

  return {
    path: file,
    basename: path.basename(file),
    filename: path.basename(file).split(".")[0],
  };
};

/**
 * Change theme
 */
export const changeTheme = async (item: ExternalTheme, config: AlacrittyConfig | null) => {
  const configFile = expandPath(getAlacrittyPreferences().configFilePath);
  const themesDirectory = getThemeDirectory(configFile);
  const newThemeFile = `${themesDirectory}/${item.basename}`;
  const currentTheme = getCurrentTheme(config);

  if (!fs.existsSync(themesDirectory)) {
    fs.mkdirSync(themesDirectory, { recursive: true });
  }

  config = config || { import: [] };
  config.import = (config.import || []).filter((filePath) => filePath !== currentTheme?.path);
  config.import.push(newThemeFile);

  fs.writeFileSync(newThemeFile, await (await fetch(item.downloadUrl)).text());
  fs.writeFileSync(configFile, toml.stringify(config, { newline: "\n", newlineAround: "section" }).trimStart());
};
