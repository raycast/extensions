import { getPreferenceValues } from "@raycast/api";
import type { Preferences } from "./types";

const appendApiKey = (baseUrl: string) => {
  const preferences = getPreferenceValues<Preferences>();
  const url = new URL(baseUrl);
  const params = new URLSearchParams(url.search);

  if (preferences.apiKey !== undefined && preferences.apiKey !== "") {
    params.append("api_key", preferences.apiKey);
  }

  return `${url.href}?${params.toString()}`;
};
export { appendApiKey };
