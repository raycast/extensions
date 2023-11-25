import { getPreferenceValues } from "@raycast/api";

type Preference = {
  accountId: string;
  service: string;
  password: string;
};

export const getPreferences = () => getPreferenceValues<Preference>();
