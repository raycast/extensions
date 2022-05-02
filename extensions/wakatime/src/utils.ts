import fetch from "node-fetch";
import { format } from "date-fns";
import { getPreferenceValues } from "@raycast/api";

const URL = "https://wakatime.com/api/v1";

export async function getUser() {
  const response = await fetch(`${URL}/users/current`, setAuthHeader());
  return (await response.json()) as WakaTime.User;
}

export async function getSummary(key: string, start: Date) {
  const response = await fetch(
    `${URL}/users/current/summaries?start=${format(start, "yyyy-MM-dd")}&end=${format(
      /last/i.test(key) ? new Date() : start,
      "yyyy-MM-dd"
    )}`,
    setAuthHeader()
  );
  return (await response.json()) as WakaTime.Summary;
}

export async function getLeaderBoard(id?: string) {
  const response = await fetch(`${URL}/${id ? `users/current/leaderboards/${id}` : "leaders"}`, setAuthHeader());
  return (await response.json()) as WakaTime.LeaderBoard;
}

export async function getPrivateLeaderBoards() {
  const response = await fetch(`${URL}/users/current/leaderboards`, setAuthHeader());
  return (await response.json()) as WakaTime.PrivateLeaderBoards;
}

export function getDuration(seconds: number) {
  const getAmount = (rate: number, unit: string) => {
    const num = Math.floor(seconds / rate);
    seconds = Math.floor(seconds - num * rate);
    return num === 0 ? "" : `${num} ${unit}`;
  };

  const hours = getAmount(60 * 60, "hr");
  const minutes = getAmount(60, "min");
  const sec = getAmount(1, "sec");

  const duration = [hours, minutes, sec].filter(Boolean).join(" ");

  return duration || "0 sec";
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

export function getFlagEmoji(countryCode: string) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

function setAuthHeader() {
  const API_KEY_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  const { apiKey } = getPreferenceValues<Preferences>();

  if (!API_KEY_REGEX.test(apiKey)) throw new Error("Invalid API Key");

  return { headers: { Authorization: `Basic ${Buffer.from(apiKey).toString("base64")}` } };
}

interface Preferences {
  apiKey: string;
}
