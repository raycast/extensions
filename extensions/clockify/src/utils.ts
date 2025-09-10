import { LocalStorage, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { FetcherArgs, FetcherResponse, TimeEntry } from "./types";

// https://clockify.me/help/getting-started/data-regions
const getApiUrl = (region: Preferences["region"]): string => {
  switch (region) {
    case "AU":
      return `https://apse2.clockify.me/api/v1`;
    case "UK":
      return `https://euw2.clockify.me/api/v1`;
    case "USA":
      return `https://use2.clockify.me/api/v1`;
    case "EU":
      return `https://euc1.clockify.me/api/v1`;
    case "GLOBAL":
      return `https://api.clockify.me/api/v1`;
    default:
      return `https://api.clockify.me/api/v1`;
  }
};

export const isInProgress = (entry: TimeEntry) => !entry?.timeInterval?.end;

export async function fetcher(
  url: string,
  { method, body, headers, ...args }: FetcherArgs = {},
): Promise<FetcherResponse> {
  const preferences = getPreferenceValues<Preferences>();
  const token = preferences.token;
  const apiURL = getApiUrl(preferences.region);

  try {
    const response = await fetch(`${apiURL}${url}`, {
      headers: { "X-Api-Key": token, "Content-Type": "application/json", ...headers },
      method: method || "GET",
      body: body ? JSON.stringify(body) : null,
      ...args,
    });

    if (response.ok) {
      // Check if response has content before trying to parse JSON
      const contentType = response.headers.get("content-type");
      const hasJsonContent = contentType && contentType.includes("application/json");

      // Only parse JSON if the response has content and is JSON
      if (hasJsonContent && response.status !== 204) {
        const data = await response.json();
        return { data };
      } else {
        // For 204 No Content or non-JSON responses, return empty data
        return { data: null };
      }
    } else {
      if (response.status === 401) {
        LocalStorage.clear();
        showToast(Toast.Style.Failure, "Invalid API Key detected");
      }

      return { error: response.statusText };
    }
  } catch (error) {
    return { error: error as Error };
  }
}

export function validateToken(): boolean {
  const preferences = getPreferenceValues<Preferences>();
  const token = preferences.token;

  if (token.length !== 48) {
    showToast(Toast.Style.Failure, "Invalid API Key detected");
    return false;
  }

  return true;
}

export function dateDiffToString(a: Date, b: Date): string {
  let diff = Math.abs(a.getTime() - b.getTime());

  const ms = diff % 1000;
  diff = (diff - ms) / 1000;
  const s = diff % 60;
  diff = (diff - s) / 60;
  const m = diff % 60;
  diff = (diff - m) / 60;
  const h = diff;

  const ss = s <= 9 && s >= 0 ? `0${s}` : s;
  const mm = m <= 9 && m >= 0 ? `0${m}` : m;
  const hh = h <= 9 && h >= 0 ? `0${h}` : h;

  return hh + ":" + mm + ":" + ss;
}

export function showElapsedTime(entry: TimeEntry): string {
  if (entry?.timeInterval?.start) {
    return dateDiffToString(new Date(), new Date(entry.timeInterval.start));
  }

  return ``;
}
