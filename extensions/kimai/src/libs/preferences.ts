import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  domain: string;
  password?: string;
  email?: string;
  token?: string;
  protocol?: "https" | "http";
  duration: string;
}

const getPreferences = () => {
  const preferences = getPreferenceValues<Preferences>();
  return preferences;
};

export default getPreferences;
