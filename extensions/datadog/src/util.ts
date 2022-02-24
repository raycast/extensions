import { getPreferenceValues } from "@raycast/api";

export const linkDomain = () => {
  return getPreferenceValues()["domain"] || "app." + getPreferenceValues()["server"];
};
