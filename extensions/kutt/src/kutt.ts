import { getPreferenceValues } from "@raycast/api";

const { kutt_url, api_key } = getPreferenceValues<Preferences>();
export const LIMIT = 20;
export const buildApiUrl = (endpoint = "") => new URL(`api/v2/${endpoint}`, kutt_url).toString();
export const parseApiResponse = async (response: Response) => {
  const result = await response.json();
  if (!response.ok) throw new Error((result as { error: string }).error);
  return result;
};
export const API_HEADERS = {
  "X-API-KEY": api_key,
  "Content-Type": "application/json",
};
