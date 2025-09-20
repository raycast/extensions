import { format } from "date-fns";
import { getPreferenceValues } from "@raycast/api";

import { KNOWN_RANGES } from ".";

/**
 * It takes an endpoint and returns a promise that resolves to an object with an ok property and either
 * a data property or an error property
 * @param {string} endpoint - string - The endpoint to hit.
 * @returns A function that returns a promise that resolves to a RouteResponse<T>
 */
async function routeHandler<T extends object>(endpoint: string): Promise<Types.RouteResponse<T>> {
  const { apiBaseUrl } = getPreferenceValues<{ apiBaseUrl?: string }>();
  const baseURL = apiBaseUrl || "https://wakatime.com/api/v1";

  try {
    const res = await fetch(`${baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL}${endpoint}`, {
      headers: getAuthToken(),
    });
    const result = (await res.json()) as T | { error: string } | { errors: string[] };

    if ("error" in result) throw new Error(result.error);
    if ("errors" in result) throw new Error(result.errors.join(", "));

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

  if (!apiKey) throw new Error("Missing API Key");
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
export const getSummary: {
  (key: WakaTime.KNOWN_RANGE): ReturnType<typeof routeHandler<WakaTime.Summary>>;
  (key: string, start: Date): ReturnType<typeof routeHandler<WakaTime.Summary>>;
} = (key: string, start?: Date) => {
  if (KNOWN_RANGES[key as WakaTime.KNOWN_RANGE] != null) {
    return routeHandler<WakaTime.Summary>(`/users/current/summaries?range=${key}`);
  }

  if (start == null) throw new Error("Start date must be provided for custom ranges.");

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
