import { getPreferenceValues } from "@raycast/api";

interface Preferencess {
  url: string;
  format: string;
}

export const getPreferences = () => {
  return getPreferenceValues<Preferencess>();
};
