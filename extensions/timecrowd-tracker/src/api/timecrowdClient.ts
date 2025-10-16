import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  accessToken: string;
}
const baseUrl = "https://timecrowd.net";
const preferences = getPreferenceValues<Preferences>();
const accessToken = preferences.accessToken;

export const get = <T>(url: string) => timecrowdFetch<T>("GET", url);
export const post = <T>(url: string, body?: unknown) => timecrowdFetch<T>("POST", url, body);
export const patch = <T>(url: string, body?: unknown) => timecrowdFetch<T>("PATCH", url, body);

const timecrowdFetch = async <T>(method: string, url: string, body?: unknown) => {
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error();
  }

  return (await response.json()) as T;
};
