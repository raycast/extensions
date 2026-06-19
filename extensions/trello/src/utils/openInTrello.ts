import { getPreferenceValues } from "@raycast/api";

export type OpenTarget = "web" | "app";

export function getDefaultOpenTarget(): OpenTarget {
  return getPreferenceValues<Preferences>().defaultOpenTarget ?? "web";
}

export function toTrelloAppUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "trello://");
}
