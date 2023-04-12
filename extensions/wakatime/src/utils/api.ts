import fetch from "node-fetch";
import { format } from "date-fns";
import { getPreferenceValues } from "@raycast/api";

/**
 * It takes an endpoint and returns a promise that resolves to an object with an ok property and either
 * a data property or an error property
 * @param {string} endpoint - string - The endpoint to hit.
 * @returns A function that returns a promise that resolves to a RouteResponse<T>
 */
async function routeHandler<T extends object>(endpoint: string): Promise<Types.RouteResponse<T>> {
  const baseURL = "https://wakatime.com/api/v1";

  try {
    const res = await fetch(`${baseURL}${endpoint}`, { headers: getAuthToken() });
    const result = (await res.json()) as T | { error: string };

    if ("error" in result) throw new Error(result.error);
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      error: (error as Error).message,
    };
  }
}

/**
 * It gets the API key from the preferences, checks if it's valid, and returns the API key in a format
 * that can be used in the Authorization header
 * @returns A string that is the base64 encoded version of the API key.
 */
// Regex adapted from - https://github.com/wakatime/vscode-wakatime/blob/140fd7018fa3499eac9ee2c6289747d255982dfd/src/utils.ts#L12-L15
function getAuthToken() {
  const API_KEY_REGEX = /^(waka_)?[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  const { apiKey } = getPreferenceValues<{ apiKey?: string }>();

  if (!apiKey) return;
  if (!API_KEY_REGEX.test(apiKey)) throw new Error("Invalid API Key");

  return { Authorization: `Basic ${Buffer.from(apiKey).toString("base64")}` };
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
 * It takes a key and a start date, and returns a promise that resolves to a WakaTime.Summary object
 * @param {string} key - The key of the summary you want to get.
 * @param {Date} start - The start date of the summary.
 * @returns A promise that resolves to a WakaTime.Summary object.
 */
export const getSummary = (key: string, start: Date) => {
  const end = /^last/i.test(key) ? new Date() : start;
  const query = `?start=${format(start, "yyyy-MM-dd")}&end=${format(end, "yyyy-MM-dd")}`;

  return routeHandler<WakaTime.Summary>(`/users/current/summaries${query}`);
};

/**
 * It fetches the leaderboard data from the WakaTime API and returns it as a `WakaTime.LeaderBoard` object
 * @param {string} [id] - The id of the leaderboard you want to get. If you don't pass an id, you'll
 * get the default public leaderboard.
 */
export const getLeaderBoard = ({ id, page }: { id?: string; page?: number } = {}) => {
  const query = page == undefined ? "" : `?page=${page}`;
  return routeHandler<WakaTime.LeaderBoard>(id ? `/users/current/leaderboards/${id}${query}` : `/leaders${query}`);
};

/**
 * It fetches the user's private leaderboards from the WakaTime API and returns it as a `WakaTime.PrivateLeaderBoards` object
 * @returns `WakaTime.PrivateLeaderBoards`
 */
export const getPrivateLeaderBoards = () => routeHandler<WakaTime.PrivateLeaderBoards>(`/users/current/leaderboards`);
