import { getPreferenceValues } from "@raycast/api";
import { ErrorResult } from "./types";

const { sendportal_url, sendportal_api_key } = getPreferenceValues<Preferences>();
const API_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${sendportal_api_key}`,
};
export const buildUrl = (route: string) => new URL(route, sendportal_url).toString();
export const sendportalRequest = async <T>(endpoint: string, options?: RequestInit) => {
  const url = buildUrl(`api/v1/${endpoint}`);
  const response = await fetch(url, { headers: API_HEADERS, ...options });
  if (response.status === 204) return undefined as T;
  if (!response.headers.get("Content-Type")?.includes("application/json")) throw new Error(await response.text());
  const result = await response.json();
  if (!response.ok) {
    const err = result as ErrorResult;
    throw new Error(err.errors ? Object.values(err.errors)[0][0] : err.message);
  }
  return result as T;
};
