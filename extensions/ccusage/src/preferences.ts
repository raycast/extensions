import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import { sep } from "path";

export const preferences = getPreferenceValues<Preferences>();

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
