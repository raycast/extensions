import { getPreferenceValues } from "@raycast/api";

const { api_key } = getPreferenceValues<Preferences>();
export const API_URL = "https://api.brand.dev/v1/brand/";
export const API_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${api_key}`,
};
export async function parseBrandDevResponse<T>(response: Response) {
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error(response.statusText);
  const result = await response.json();
  if (!response.ok) {
    const err = result as { error_code: string; message?: string | Array<{ message: string }> };
    const message = err.message && Array.isArray(err.message) ? err.message[0]?.message : err.message;
    throw new Error(message || err.error_code);
  }
  return result as T;
}
export function capitalize(txt: string) {
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}
