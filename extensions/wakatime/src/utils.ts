import fetch, { RequestInit } from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { format, formatDuration, intervalToDuration, subSeconds } from "date-fns";

const URL = "https://wakatime.com/api/v1";

export async function getUser() {
  const response = await fetch(`${URL}/users/current`, setHeaders());
  return (await response.json()) as WakaTime.User;
}

export async function getSummary(key: string, start: Date) {
  const response = await fetch(
    `${URL}/users/current/summaries?start=${format(start, "yyyy-MM-dd")}&end=${format(
      /last/i.test(key) ? new Date() : start,
      "yyyy-MM-dd"
    )}`,
    setHeaders()
  );
  return (await response.json()) as WakaTime.Summary;
}

export function getDuration(seconds: number) {
  return formatDuration(intervalToDuration({ end: new Date(), start: subSeconds(new Date(), seconds) })) || "0 seconds";
}

export function cumulateSummaryDuration(
  { data }: WakaTime.Summary,
  key: keyof Omit<typeof data[0], "grand_total" | "range">
) {
  const obj = Object.entries(
    data
      .map((item) => item[key])
      .flat()
      .reduce((acc, item) => {
        const { name = "", total_seconds = 0 } = item ?? {};
        return {
          ...acc,
          [name]: total_seconds + (acc[name] ?? 0),
        };
      }, {} as { [name: string]: number })
  ).sort((a, b) => b[1] - a[1]);

  return obj.slice(0, 5);
}

function setHeaders(headers: RequestInit = {}) {
  const API_KEY_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  const { apiKey } = getPreferenceValues<Preferences>();

  if (!API_KEY_REGEX.test(apiKey)) throw new Error("Invalid API Key");

  return {
    ...headers,
    headers: {
      ...headers.headers,
      Authorization: `Basic ${Buffer.from(apiKey).toString("base64")}`,
    },
  };
}

interface Preferences {
  apiKey: string;
}
