import { getPreferenceValues } from "@raycast/api";
import { join } from "path";
import { homedir } from "os";

export const getGridColumns = (): number => {
  const { gridItemSize } = getPreferenceValues<Preferences>();
  if (gridItemSize === "small") return 8;
  if (gridItemSize === "large") return 3;
  return 5;
};

export const showImageTitle = (): boolean => getPreferenceValues<Preferences>().showImageTitle;

export const toTitleCase = (str: string): string =>
  str.replace(/\w\S*/g, (text) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase());

export const resolveHome = (filepath: string): string =>
  filepath.startsWith("~") ? join(homedir(), filepath.slice(1)) : filepath;
