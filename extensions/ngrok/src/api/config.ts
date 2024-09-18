import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  ngrokAuthToken: string;
  ngrokApiKey: string;
}

export const config = {
  authToken: getPreferenceValues<Preferences>().ngrokAuthToken,
  apiKey: getPreferenceValues<Preferences>().ngrokApiKey,
  baseUrl: "https://api.ngrok.com",
  localApi: "http://127.0.0.1:4040",
};
