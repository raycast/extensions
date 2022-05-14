import fetch from "node-fetch";
import { format } from "date-fns";
import { getPreferenceValues } from "@raycast/api";

async function routeHandler<T>(endpoint: string): Promise<(T & { ok: true }) | { ok: false; error: string }> {
  const URL = "https://wakatime.com/api/v1";

  try {
    const response = await fetch(`${URL}${endpoint}`, setAuthHeader());
    return {
      ok: true,
      ...((await response.json()) as T),
    };
  } catch (error) {
    return {
      ok: false,
      error: (error as Record<string, string>).message,
    };
  }
}

/**
 * It takes the API key from the user's preferences, validates it, and returns an object with the API key in the Authorization header
 * @returns An object with a header property that contains the Authorization header.
 */
function setAuthHeader() {
  const API_KEY_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  const { apiKey } = getPreferenceValues<{ apiKey: string }>();

  if (!API_KEY_REGEX.test(apiKey)) throw new Error("Invalid API Key");

  return { headers: { Authorization: `Basic ${Buffer.from(apiKey).toString("base64")}` } };
}

/**
 * It fetches the current user from the WakaTime API and returns the response as a User object
 * @returns WakaTime.User
 */
export const getUser = () => routeHandler<WakaTime.User>(`/users/current`);

/**
 * It fetches the current user's projects from the WakaTime API and returns the response as a `WakaTime.Projects` object
 * @returns `WakaTime.Projects`
 */
export const getProjects = () => routeHandler<WakaTime.Projects>(`/users/current/projects`);

/**
 * It fetches the user's summary data from the WakaTime API and returns it as a `WakaTime.Summary` object
 * @param {string} key - The key of the summary you want to get.
 * @param {Date} start - The start date of the summary.
 * @returns WakaTime.Summary
 */
export const getSummary = (key: string, start: Date) =>
  routeHandler<WakaTime.Summary>(
    `/users/current/summaries?start=${format(start, "yyyy-MM-dd")}&end=${format(
      /last/i.test(key) ? new Date() : start,
      "yyyy-MM-dd"
    )}`
  );

/**
 * It fetches the leaderboard data from the WakaTime API and returns it as a `WakaTime.LeaderBoard` object
 * @param {string} [id] - The id of the leaderboard you want to get. If you don't pass in an id, it will return the public global leaderboard.
 * @returns WakaTime.LeaderBoard
 */
export const getLeaderBoard = (id?: string) =>
  routeHandler<WakaTime.LeaderBoard>(id ? `/users/current/leaderboards/${id}` : "/leaders");

/**
 * It fetches the user's private leaderboards from the WakaTime API and returns it as a `WakaTime.PrivateLeaderBoards` object
 * @returns `WakaTime.PrivateLeaderBoards`
 */
export const getPrivateLeaderBoards = () => routeHandler<WakaTime.PrivateLeaderBoards>(`/users/current/leaderboards`);
