import { getPreferenceValues } from "@raycast/api";

interface ApiConfig {
  host: string;
  token: string;
}

export const getApiConfig = async (): Promise<ApiConfig> => {
  const preferences = getPreferenceValues<Preferences>();
  const { host, token } = preferences;
  if (!host || !token) {
    throw new Error("API host and token are required");
  }
  return { host, token };
};
