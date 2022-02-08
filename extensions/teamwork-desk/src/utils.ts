import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  domain: string;
  apikey: string;
}
const preferences: Preferences = getPreferenceValues();

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export function formatDate(input: Date | string) {
  const date = typeof input === "string" ? new Date(input) : input;
  return timeAgo.format(date, "round") as string;
}

export function getUrl() {
  return "https://" + preferences.domain + ".teamwork.com";
}

export function getHeaders() {
  return {
    headers: {
      "Content-type": "application/json",
      Authorization: "Bearer " + preferences.apikey,
    },
  };
}

export function getllTicketsUrl() {
  return (
    "https://" +
    preferences.domain +
    '.teamwork.com/desk/api/v2/tickets.json?includes=all&filter={"status": {"$in": [1,3,244,245]}}&orderBy=updatedAt&orderMode=DESC'
  );
}

export function getIndex(arr: [], id: number) {
  return arr.findIndex((obj: { id: number }) => obj.id == id);
}
