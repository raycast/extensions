import { getPreferenceValues } from "@raycast/api";
import { preferences } from "./types";

export type OpenTarget = "web" | "app";

export function getDefaultOpenTarget(): OpenTarget {
  return getPreferenceValues<preferences>().defaultOpenTarget ?? "web";
}

export function toTrelloAppUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "trello://");
}
