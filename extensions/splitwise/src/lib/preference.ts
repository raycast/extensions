import { getPreferenceValues } from "@raycast/api";
type Preference = {
  consumerKey: string;
  consumerSecret: string;
};

export const getPreferences = () => getPreferenceValues<Preference>();
