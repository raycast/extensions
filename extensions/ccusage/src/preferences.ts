import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import { sep } from "path";

export const preferences = getPreferenceValues<Preferences>();
const menuBarPreferences = getPreferenceValues<Preferences.MenubarCcusage>();

export const showRemainingUsage = (): boolean => (menuBarPreferences.showRemainingUsage as string) !== "consumed";

export const getMenuBarTitle = ():
  | "todayUsage"
  | "todayCost"
  | "monthlyCost"
  | "todayTokens"
  | "fiveHour"
  | "sevenDay"
  | "utilization"
  | "none" =>
  (menuBarPreferences.menuBarTitle as
    | "todayUsage"
    | "todayCost"
    | "monthlyCost"
    | "todayTokens"
    | "fiveHour"
    | "sevenDay"
    | "utilization"
    | "none") ?? "todayUsage";

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
