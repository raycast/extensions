import { getPreferenceValues } from "@raycast/api";
import { Configuration } from "./trefle";

export const getConfiguration = (): Configuration => {
  const accessToken = getPreferenceValues<Preferences>().accessToken;
  return new Configuration({
    apiKey: accessToken,
  });
};
