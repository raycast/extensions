import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import { sep } from "path";
import type { Image } from "@raycast/api";
import { Icon } from "@raycast/api";
import type { ProgressBarStyle } from "./utils/usage-limits-formatter";

export const preferences = getPreferenceValues<Preferences>();
const menuBarPreferences = getPreferenceValues<Preferences.MenubarCcusage>();

export const showRemainingUsage = (): boolean => (preferences.showRemainingUsage as string) === "remaining";

type MenuBarTitleMode =
  | "todayUsage"
  | "todayCost"
  | "weeklyCost"
  | "monthlyCost"
  | "todayTokens"
  | "fiveHour"
  | "sevenDay"
  | "utilization"
  | "blockProjection"
  | "none";

export const getMenuBarTitle = (): MenuBarTitleMode =>
  (menuBarPreferences.menuBarTitle as MenuBarTitleMode) ?? "todayUsage";

export const getProgressBarStyle = (): ProgressBarStyle =>
  (menuBarPreferences.progressBarStyle as ProgressBarStyle) ?? "solid";

export type MenuBarIconStyle = "color" | "monochrome" | "pie";

export const getMenuBarIconStyle = (): MenuBarIconStyle =>
  (menuBarPreferences.menuBarIconStyle as MenuBarIconStyle) ?? "color";

export const getMenuBarIcon = (): Image.Source => {
  const style = getMenuBarIconStyle();
  if (style === "monochrome") return Icon.BarChart;
  // "pie" is handled dynamically in the menu bar command (requires utilization data)
  // so we return the color icon as a fallback while data loads.
  return "extension-icon.png";
};

export const getMenuBarTimeRemaining = (): boolean => menuBarPreferences.menuBarTimeRemaining === true;

export const getMenuBarTimeRemainingFormat = (): string =>
  (menuBarPreferences.menuBarTimeRemainingFormat as string) || "{h}h{m}m";

export const getCustomNpxPath = (): string | undefined => {
  const customPath = preferences.customNpxPath?.trim();
  if (!customPath) return undefined;
  if (customPath === "~") {
    return homedir();
  }
  if (customPath.startsWith("~/") || customPath.startsWith(`~${sep}`)) {
    return homedir() + customPath.slice(1);
  }
  return customPath;
};
