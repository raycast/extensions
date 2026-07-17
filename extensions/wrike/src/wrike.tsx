import { URLSearchParams } from "url";
import { APIError, Preferences, WrikeResponse, WrikeUser } from "./types";
import { getPreferenceValues, LocalStorage } from "@raycast/api";
import fetch from "node-fetch";

export async function getRequest<T>(
  endpoint: string,
  params: URLSearchParams,
  signal: AbortSignal
): Promise<WrikeResponse<T>> {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`https://www.wrike.com/api/v4/${endpoint}?${params.toString()}`, {
    method: "get",
    headers: {
      Authorization: `bearer ${preferences.token}`,
    },
    signal,
  });

  const json = (await response.json()) as WrikeResponse<T> | APIError;
  if (!response.ok || "errorDescription" in json) {
    throw new Error("errorDescription" in json ? json.errorDescription : response.statusText);
  }

  return json;
}

export async function getCurrentUser(signal: AbortSignal): Promise<WrikeUser> {
  const currentUserString = await LocalStorage.getItem<string>("currentUser");
  if (currentUserString) {
    return JSON.parse(currentUserString) as WrikeUser;
  } else {
    const users = await getRequest<WrikeUser>("contacts", new URLSearchParams(), signal);
    const currentUser = users.data.find((user) => user.me);
    if (!currentUser) {
      throw new Error("Unable to find current user. Odd...");
    }
    LocalStorage.setItem("currentUser", JSON.stringify(currentUser));
    return currentUser;
  }
}

export function statusToColorMap(status: string): string {
  return (
    {
      Active: "#26a0f5",
      Completed: "#8bc34a",
      Deferred: "#a62cb9",
      Cancelled: "#a8a8a8",
    }[status] ?? "#fff"
  );
}
