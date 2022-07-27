import { getPreferenceValues } from "@raycast/api";

type Preference = {
  api_token: string;
};

export const getAPIToken = () => getPreferenceValues<Preference>().api_token;
