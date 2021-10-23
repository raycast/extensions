import { getPreferenceValues } from "@raycast/api";

interface MyPreferences {
  accesstoken: string;
}
export const prefs = () => getPreferenceValues<MyPreferences>();
