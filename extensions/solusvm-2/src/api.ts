import { getPreferenceValues } from "@raycast/api";

const { instance_url, api_token } = getPreferenceValues<Preferences>();
export const API_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${api_token}`,
};
export function generateApiUrl(route: string) {
  return new URL(`api/v1/${route}`, instance_url).toString();
}

export async function callApi(
  route: string,
  { method, body }: { method: string; body?: Record<string, string | number | number[]> },
) {
  const response = await fetch(generateApiUrl(route), {
    method,
    headers: API_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return;
  const result = await response.json();
  if (!response.ok) throw new Error((result as Error).message);
  return result;
}
