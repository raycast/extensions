import { getPreferences } from "./preferences";
import fetch, { Response } from "node-fetch";
import { ErrStatus400, ErrStatus401 } from "./errors";

const preferences = getPreferences();

/**
 * `buildUrl` is a function that constructs a url from an array of path segments and an optional query object.
 *
 * @param paths The array of path segments that forms the URL to be created.
 * @param query An optional parameter, is an object of key/value pairs to be used as query parameters in the URL.
 *
 * @returns The constructed URL as a string.
 *
 * @example
 * // returns a URL 'base/path1/path2?key=value'
 * buildUrl(['path1', 'path2'], { key: 'value' })
 *
 * // returns a URL 'base/path1/path2?key
 */
export function buildUrl(paths: string[], query?: { [key: string]: string | string[] }) {
  const params = new URLSearchParams();
  if (!query) {
    query = { ApiKey: preferences.jellyfinApiKey };
  }
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const val of value) {
        params.append(key, val);
      }
    } else {
      params.append(key, value);
    }
  }
  return `${preferences.jellyfinBase}/${paths.join("/")}?${params.toString()}`;
}

/**
 * HelpError is an error which has (helpful) advice to fix it which is shown in a markdown detail view.
 */
export class HelpError extends Error {
  constructor(public message: string, public helpMessage: string) {
    super(message);
  }
}

/**
 * Throw a custom error depending on the HTTP response status.
 *
 * If the server response status is 400 or 401, the function throws a `HelpError`.
 * For any other response status, the function throws a generic `Error`.
 *
 * @param {Response} resp – The response object from the server.
 *
 * @throws {HelpError} – Throws when the response status from the server is 400 (Bad Request) or
 * 401 (Unauthorized).
 * @throws {Error} - Throws for other status codes. The error message contains the server response status like
 * `"Server returned <status>"`.
 */
function throwFetchError(resp: Response) {
  const message = `Server returned ${resp.status}`;
  // maybe we can help the user a bit if the status code is a known issue
  switch (resp.status) {
    case 400:
      throw new HelpError(message, ErrStatus400);
    case 401:
      // 401 means probably API Token is wrong
      throw new HelpError(message, ErrStatus401);
  }
  throw new Error(message);
}

/**
 * Represents the type of the media item
 */
export type MediaType = "Movie" | "Series" | "BoxSet";

/**
 * Item object returned by the Jellyfin REST API
 */
export interface RawMediaItem {
  Name: string;
  Id: string;
  ServerId: string;
  ProductionYear: number;
  CommunityRating: number;
  Type: MediaType;
  ImageTags: {
    Primary: string;
  };
  UserData: {
    Played: boolean;
    IsFavorite: boolean;
  };
}

/**
 * Asynchronously fetches media items from a Jellyfin server.
 *
 * @export
 * @param {MediaType[]} types - An array of MediaType enums which specifies the types of media items to fetch.
 * @param {string} [parentId=""] - The ID of the parent container of the media items to fetch (default is an empty string, which means fetching all items).
 * @returns {Promise<RawMediaItem[]>} - A promise that resolves to an array of RawMediaItem objects that represent the fetched media items.
 * @throws {Error} - Thrown when the fetch response is not OK.
 * @throws {HelpError} - Thrown when the fetch response is not OK and has status 400 or 401.
 */
export async function fetchItems(types: MediaType[], parentId = ""): Promise<RawMediaItem[]> {
  const url = buildUrl(["Users", preferences.jellyfinUserID, "Items"], {
    SortBy: "SortName",
    SortOrder: "Ascending",
    IncludeItemTypes: types.join(","),
    Recursive: "true",
    ImageTypeLimit: "1",
    EnableImageTypes: "Primary",
    Limit: "10000",
    ParentId: parentId,
    ApiKey: preferences.jellyfinApiKey,
  });
  const resp = await fetch(url);
  if (!resp.ok) {
    throwFetchError(resp);
  }
  const media = (await resp.json()) as { Items: RawMediaItem[] };
  return media.Items;
}

export type TaskState = "Running" | "Idle";

export interface ScheduledTask {
  Name: string;
  State: TaskState;
  CurrentProgressPercentage?: number;
  Id: string;
  Description: string;
  Category: string;
  IsHidden: boolean;
  Key: string;
}

/**
 * Fetches the list of all currently running scheduled tasks asynchronously.
 *
 * @export
 * @returns {Promise<ScheduledTask[]>} - Returns a promise that resolves to an array of ScheduledTask,
 * representing all running tasks.
 * @throws { FetchError } - Throws an error if the response from the fetch is not ok.
 */
export async function fetchScheduledTasks(): Promise<ScheduledTask[]> {
  const url = buildUrl(["ScheduledTasks"]);
  const resp = await fetch(url);
  if (!resp.ok) {
    throwFetchError(resp);
  }
  return (await resp.json()) as ScheduledTask[];
}

export async function signalTask(id: string, action = "DELETE"): Promise<boolean> {
  const url = buildUrl(["ScheduledTasks", "Running", id]);
  const resp = await fetch(url, { method: action });
  if (!resp.ok) {
    throwFetchError(resp);
  }
  return resp.ok;
}

export interface Session {
  PlayState: {
    IsPaused: boolean;
    IsMuted: boolean;
  };
  RemoteEndPoint: string;
  Id: string;
  UserId: string;
  UserName?: string;
  Client: string;
  DeviceName: string;
  DeviceId: string;
  ApplicationVersion: string;
  SupportsMediaControl: boolean;
  SupportsRemoteControl: boolean;
  NowPlayingItem?: {
    Name: string;
    ServerId: string;
    Id: string;
    Overview: string;
    CommunityRating: number;
    RunTimeTicks: number;
    ProductionYear: number;
    ParentId: string;
    Type: string;
    SeriesName?: string;
  };
  LastActivityDate: string;
  NowPlayingQueue: [];
  NowPlayingQueueFullItems: [];
  ServerId: string;
  SupportedCommands: string[];
}

export async function fetchRecentSessions(): Promise<Session[]> {
  const url = buildUrl(["Sessions"], { ActiveWithinSeconds: "960", ApiKey: preferences.jellyfinApiKey });
  const resp = await fetch(url);
  if (!resp.ok) {
    throwFetchError(resp);
  }
  const sessions = (await resp.json()) as Session[];
  const now = new Date();
  return sessions.filter(
    (session) => session.UserName && (now.getTime() - Date.parse(session.LastActivityDate)) / 1000 <= 960
  );
}

export async function signalSessionCommand(sessionId: string, command: string) {
  const url = buildUrl(["Sessions", sessionId, "Command"]);
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Name: command,
      ControllingUserId: preferences.jellyfinUserID,
      Arguments: {},
    }),
  });
  if (!resp.ok) {
    throwFetchError(resp);
  }
}
