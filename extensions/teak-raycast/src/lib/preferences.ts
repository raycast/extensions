import { getPreferenceValues } from "@raycast/api";

export type RaycastPreferences = {
  apiKey: string;
};

export const getPreferences = (): RaycastPreferences => {
  return getPreferenceValues<RaycastPreferences>();
};
