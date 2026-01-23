import { getPreferenceValues } from "@raycast/api";

const { api_key } = getPreferenceValues<ExtensionPreferences>();
const API_URL = "https://api.nicnames.com/2/";
const API_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "x-api-key": api_key,
};
export const callApi = async <T>(endpoint: string) => {
  const response = await fetch(API_URL + endpoint, {
    headers: API_HEADERS,
  });
  const result = await response.json();
  if (!response.ok) throw new Error((result as Error).message);
  return result as T;
};
