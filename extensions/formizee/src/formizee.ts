import { getPreferenceValues } from "@raycast/api";

export const FORMIZEE_URL = "https://api.formizee.com/v1/";
const { api_key } = getPreferenceValues<Preferences>();
export const FORMIZEE_HEADERS = {
  Authorization: `Bearer ${api_key}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};
export const parseFormizeeResponse = async (response: Response) => {
  const result = await response.json();
  if (!response.ok) throw new Error((result as Error).message);
  return result;
};
