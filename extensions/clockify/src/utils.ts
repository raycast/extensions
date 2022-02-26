import { clearLocalStorage, getPreferenceValues, showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";
import { FetcherArgs, FetcherResponse, PreferenceValues, TimeEntry } from "./types";

export const API_URL = `https://api.clockify.me/api/v1`;

export const isInProgress = (entry: TimeEntry) => !entry?.timeInterval?.end;

export async function fetcher(
  url: string,
  { method, body, headers, ...args }: FetcherArgs = {}
): Promise<FetcherResponse> {
  const preferences: PreferenceValues = getPreferenceValues();
  const token = String(preferences?.token);

  try {
    const response = await fetch(`${API_URL}${url}`, {
      headers: { "X-Api-Key": token, "Content-Type": "application/json", ...headers },
      method: method || "GET",
      body: body ? JSON.stringify(body) : null,
      ...args,
    });

    if (response.ok) {
      const data = await response.json();
      return { data };
    } else {
      if (response.status === 401) {
        clearLocalStorage();
        showToast(ToastStyle.Failure, "Invalid API Key detected");
      }

      return { error: response.statusText };
    }
  } catch (error) {
    return { error: error as Error };
  }
}

export function validateToken(): boolean {
  const preferences: PreferenceValues = getPreferenceValues();
  const token = String(preferences?.token);

  if (token.length !== 48) {
    showToast(ToastStyle.Failure, "Invalid API Key detected");
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
