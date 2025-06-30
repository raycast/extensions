import { getPreferenceValues } from "@raycast/api";

type Preference = {
  api_token: string;
  api_base_url: string;
  instance_url: string;
};

export const getPreferences = () => getPreferenceValues<Preference>();
