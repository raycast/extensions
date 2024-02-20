import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  domain: string;
  password: string;
  email: string;
}

const getPreferences = () => {
  const preferences = getPreferenceValues<Preferences>();
  return preferences;
};

export default getPreferences;
