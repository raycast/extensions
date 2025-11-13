import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  endpoint: string;
  token: string;
  useStringIds: boolean;
}

export const getEnv = () => getPreferenceValues<Preferences>();
