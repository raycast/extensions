import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  username: string;
  password: string;
  instanceUrl: string;
}

export const getPreferences = (): Preferences => {
  const preferences = getPreferenceValues<Preferences>();
  return {
    ...preferences,
    instanceUrl: preferences.instanceUrl.replace(/\/$/, ""), // Remove trailing slash
  };
};
