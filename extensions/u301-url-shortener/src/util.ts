import { getPreferenceValues } from "@raycast/api";
import fetch, { Headers } from "node-fetch";

export function isValidURL(string: string) {
  const regex = new RegExp(
    /(http(s)?:\/\/.)(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g,
  );
  return string.match(regex);
}

export function uniqueArray(items?: string[]): string[] {
  if (!items) {
    return [];
  }
  return Array.from(new Set(items));
}

export async function shortenURL(url: string) {
  const preferences = getPreferenceValues();
  const headers = new Headers({
    Accept: "application/json",
  });
  if (preferences.accessToken) {
    headers.append("Authorization", `Bearer ${preferences.accessToken}`);
  }
  let URL = `https://api.u301.com/v2/shorten?url=${encodeURIComponent(url)}`;
  if (preferences.domainName) {
    URL += `&domain=${preferences.domainName}`;
  }
  const res = await fetch(URL, {
    headers,
  });
  return (await res.json()) as { shortened: string; message?: string };
}
