import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import { sep } from "path";
import type { Image } from "@raycast/api";
import { Icon } from "@raycast/api";
import type { ProgressBarStyle } from "./utils/usage-limits-formatter";

export const preferences = getPreferenceValues<Preferences>();
const menuBarPreferences = getPreferenceValues<Preferences.MenubarCcusage>();

export const showRemainingUsage = (): boolean => (menuBarPreferences.showRemainingUsage as string) !== "consumed";

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

export const getMenuBarIcon = (): Image.Source =>
  menuBarPreferences.menuBarIconStyle === "monochrome" ? Icon.BarChart : "extension-icon.png";

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
