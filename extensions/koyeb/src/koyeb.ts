import { getPreferenceValues } from "@raycast/api";
import { ErrorResult } from "./types";

const { api_key } = getPreferenceValues<Preferences>();
export const API_URL = "https://app.koyeb.com/v1/";
export const headers = {
  Authorization: `Bearer ${api_key}`,
  "Content-Type": "application/json",
};
export async function parseResponse(response: Response) {
  const result = await response.json();
  if (!response.ok) {
    const err = result as ErrorResult;
    if (err.fields?.length) throw new Error(`${err.fields[0].field} ${err.fields[0].description}`);
    throw new Error(err.message);
  }
  return result;
}
