import { getPreferenceValues } from "@raycast/api";
import { Creem, HTTPClient } from "creem";

const { mode, api_key, test_api_key } = getPreferenceValues<Preferences>();
const API_KEY = mode === "production" ? api_key : test_api_key;

const httpClient = new HTTPClient({
  fetcher: (request) => fetch(request),
});
httpClient.addHook("response", async (response) => {
  if (!response.ok) throw new Error(response.statusText);
});
export const creem = new Creem({ serverIdx: mode === "production" ? 0 : 1, apiKey: API_KEY, httpClient });
