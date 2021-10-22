import { getPreferenceValues, preferences, showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";
import { FetcherArgs, FetcherResponse, PreferenceValues, TimeEntry } from "./types";

export const API_URL = `https://api.clockify.me/api/v1`;

export const isInProgress = (entry: TimeEntry) => !entry?.timeInterval?.end;

export const TOKEN = preferences.token?.value;

export async function fetcher(
  url: string,
  { method, body, headers, ...args }: FetcherArgs = {}
): Promise<FetcherResponse> {
  try {
    const response = await fetch(`${API_URL}${url}`, {
      headers: { "X-Api-Key": TOKEN, "Content-Type": "application/json", ...headers },
      method: method || "GET",
      body: body ? JSON.stringify(body) : null,
      ...args,
    });

    if (response.ok) {
      const data = await response.json();
      return { data };
    } else {
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
