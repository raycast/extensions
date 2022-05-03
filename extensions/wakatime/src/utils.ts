import fetch from "node-fetch";
import { format } from "date-fns";
import { getPreferenceValues } from "@raycast/api";

const URL = "https://wakatime.com/api/v1";

/**
 * It fetches the current user from the WakaTime API and returns the response as a User object
 * @returns WakaTime.User
 */
export async function getUser() {
  const response = await fetch(`${URL}/users/current`, setAuthHeader());
  return (await response.json()) as WakaTime.User;
}

/**
 * It fetches the user's summary data from the WakaTime API and returns it as a `WakaTime.Summary` object
 * @param {string} key - The key of the summary you want to get.
 * @param {Date} start - The start date of the summary.
 * @returns WakaTime.Summary
 */
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

/**
 * It fetches the leaderboard data from the WakaTime API and returns it as a `WakaTime.LeaderBoard` object
 * @param {string} [id] - The id of the leaderboard you want to get. If you don't pass in an id, it will return the public global leaderboard.
 * @returns WakaTime.LeaderBoard
 */
export async function getLeaderBoard(id?: string) {
  const response = await fetch(`${URL}/${id ? `users/current/leaderboards/${id}` : "leaders"}`, setAuthHeader());
  return (await response.json()) as WakaTime.LeaderBoard;
}

/**
 * It fetches the user's private leaderboards from the WakaTime API and returns it as a `WakaTime.PrivateLeaderBoards` object
 * @returns `WakaTime.PrivateLeaderBoards`
 */
export async function getPrivateLeaderBoards() {
  const response = await fetch(`${URL}/users/current/leaderboards`, setAuthHeader());
  return (await response.json()) as WakaTime.PrivateLeaderBoards;
}

/**
 * It fetches the current user's projects from the WakaTime API and returns the response as a `WakaTime.Projects` object
 * @returns `WakaTime.Projects`
 */
export async function getProjects() {
  const response = await fetch(`${URL}/users/current/projects`, setAuthHeader());
  return (await response.json()) as WakaTime.Projects;
}

/**
 * It takes a number of seconds and returns a string representing the duration in hours, minutes, and seconds
 * @param {number} seconds - The number of seconds to convert to a duration.
 * @returns A string that represents the duration of a given number of seconds.
 */
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

/**
 * It takes a WakaTime summary object and a key, and returns an array of the top 5 items in that key, sorted by total time
 * @param obj - is the data from a WakaTime.Summary.
 * @param key - key to get data from
 * @returns An array of tuples, where the first element is the name of the item and the second element is the total seconds spent on that item.
 */
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

/**
 * It takes a country code, converts it to uppercase, splits it into an array of characters, maps each
 * character to its corresponding code point, and then returns a string of the code points
 * @param {string} countryCode - The country code of the country you want to get the flag emoji for.
 * @returns An emoji for the country code passed in.
 */
export function getFlagEmoji(countryCode: string) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

/**
 * It takes the API key from the user's preferences, validates it, and returns an object with the API key in the Authorization header
 * @returns An object with a header property that contains the Authorization header.
 */
function setAuthHeader() {
  const API_KEY_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  const { apiKey } = getPreferenceValues<Preferences>();

  if (!API_KEY_REGEX.test(apiKey)) throw new Error("Invalid API Key");

  return { headers: { Authorization: `Basic ${Buffer.from(apiKey).toString("base64")}` } };
}

interface Preferences {
  apiKey: string;
}
