import { Cache, LocalStorage, Toast, getPreferenceValues, showToast } from "@raycast/api";
import fetch from "node-fetch";
import uniqWith from "lodash.uniqwith";
import { ClockifyRegion, FetcherArgs, FetcherResponse, PreferenceValues, TimeEntry, Project, Task } from "./types";
import { showFailureToast } from "@raycast/utils";

const cache = new Cache();
const TIME_ENTRIES_CACHE_KEY = "clockify/timeEntries";
const PROJECTS_CACHE_KEY = "clockify/projects";

// https://clockify.me/help/getting-started/data-regions
const getApiUrl = (region: ClockifyRegion): string => {
  switch (region) {
    case "AU":
      return `https://apse2.clockify.me/api/v1`;
    case "UK":
      return `https://euw2.clockify.me/api/v1`;
    case "USA":
      return `https://use2.clockify.me/api/v1`;
    case "EU":
      return `https://euc1.clockify.me/api/v1`;
    case "GLOBAL":
      return `https://api.clockify.me/api/v1`;
    default:
      return `https://api.clockify.me/api/v1`;
  }
};

export const isInProgress = (entry: TimeEntry) => !entry?.timeInterval?.end;

export async function fetcher(
  url: string,
  { method, body, headers, ...args }: FetcherArgs = {},
): Promise<FetcherResponse> {
  const preferences: PreferenceValues = getPreferenceValues();
  const token = String(preferences?.token);
  const apiURL = getApiUrl(preferences?.region);

  try {
    const response = await fetch(`${apiURL}${url}`, {
      headers: { "X-Api-Key": token, "Content-Type": "application/json", ...headers },
      method: method || "GET",
      body: body ? JSON.stringify(body) : null,
      ...args,
    });

    if (response.ok) {
      const data = await response.json();
      return { data };
    } else {
      if (response.status === 401) {
        LocalStorage.clear();
        showToast(Toast.Style.Failure, "Invalid API Key detected");
      }

      return { error: response.statusText };
    }
  } catch (error) {
    return { error: error as Error };
  }
}

export function validateToken(): boolean {
  const preferences: PreferenceValues = getPreferenceValues();
  const token = String(preferences?.token);

  if (token.length !== 48) {
    showToast(Toast.Style.Failure, "Invalid API Key detected");
    return false;
  }

  return true;
}

export function dateDiffToString(a: Date, b: Date): string {
  let diff = Math.abs(a.getTime() - b.getTime());

  const ms = diff % 1000;
  diff = (diff - ms) / 1000;
  const s = diff % 60;
  diff = (diff - s) / 60;
  const m = diff % 60;
  diff = (diff - m) / 60;
  const h = diff;

  const ss = s <= 9 && s >= 0 ? `0${s}` : s;
  const mm = m <= 9 && m >= 0 ? `0${m}` : m;
  const hh = h <= 9 && h >= 0 ? `0${h}` : h;

  return hh + ":" + mm + ":" + ss;
}

export function getElapsedTime(entry: TimeEntry): string {
  if (entry?.timeInterval?.start) {
    return dateDiffToString(
      entry?.timeInterval?.end ? new Date(entry.timeInterval.end) : new Date(),
      new Date(entry.timeInterval.start),
    );
  }

  return ``;
}

// Convert a string to monospace font using Unicode characters
export function toMonospaceFont(text: string | null): string {
  // If text is null or undefined, return an empty string
  if (text === null || text === undefined) {
    return "";
  }

  // Map of regular characters to monospace Unicode characters
  const monospaceMap: Record<string, string> = {
    "0": "𝟶",
    "1": "𝟷",
    "2": "𝟸",
    "3": "𝟹",
    "4": "𝟺",
    "5": "𝟻",
    "6": "𝟼",
    "7": "𝟽",
    "8": "𝟾",
    "9": "𝟿",
    ":": ":", // Keep colon as is
  };

  return text
    .split("")
    .map((char) => monospaceMap[char] || char)
    .join("");
}

export async function getTimeEntries({ onError }: { onError?: (state: boolean) => void }): Promise<TimeEntry[]> {
  const workspaceId = await LocalStorage.getItem("workspaceId");
  const userId = await LocalStorage.getItem("userId");

  const { data, error } = await fetcher(
    `/workspaces/${workspaceId}/user/${userId}/time-entries?hydrated=true&page-size=500`,
  );

  if (error === "Unauthorized") {
    onError && onError(false);
    return [];
  }

  if (data?.length) {
    const filteredEntries: TimeEntry[] = uniqWith(
      data,
      (a: TimeEntry, b: TimeEntry) =>
        a.projectId === b.projectId && a.taskId === b.taskId && a.description === b.description,
    );
    cache.set(TIME_ENTRIES_CACHE_KEY, JSON.stringify(filteredEntries));

    return filteredEntries;
  } else {
    return [];
  }
}

export async function stopCurrentTimer(callback?: () => void): Promise<void> {
  showToast(Toast.Style.Animated, "Stopping…");

  const workspaceId = await LocalStorage.getItem("workspaceId");
  const userId = await LocalStorage.getItem("userId");

  const { data, error } = await fetcher(`/workspaces/${workspaceId}/user/${userId}/time-entries`, {
    method: "PATCH",
    body: { end: new Date().toISOString() },
  });

  if (!error && data) {
    showToast(Toast.Style.Success, "Timer stopped");

    // Update the cache directly or call the callback to refetch
    try {
      const entriesString = cache.get(TIME_ENTRIES_CACHE_KEY);
      if (entriesString) {
        const entries: TimeEntry[] = JSON.parse(entriesString as string);
        if (entries && entries.length > 0) {
          // Find and update the active entry
          const activeEntryIndex = entries.findIndex((entry) => !entry.timeInterval.end);
          if (activeEntryIndex !== -1) {
            entries[activeEntryIndex].timeInterval.end = new Date().toISOString();
            cache.set(TIME_ENTRIES_CACHE_KEY, JSON.stringify(entries));
          }
        }
      }
    } catch (e) {
      console.error("Error updating cache:", e);
    }

    // Call the callback if provided to refetch the time entries
    if (callback) {
      callback();
    }
  } else {
    showToast(Toast.Style.Failure, "No timer running");
  }
}

export function getCurrentlyActiveTimeEntry(): TimeEntry | null {
  try {
    const entriesString = cache.get(TIME_ENTRIES_CACHE_KEY);
    if (!entriesString) {
      return null;
    }

    const entries = JSON.parse(entriesString as string);
    if (entries && entries.length > 0) {
      const entry = entries[0];
      if (isInProgress(entry)) {
        return entry;
      }
    }

    return null;
  } catch (e) {
    console.error("Error getting time entry from cache:", e);
    return null;
  }
}

export function getAllTimeEntriesFromLocalStorage(): TimeEntry[] {
  try {
    const entriesString = cache.get(TIME_ENTRIES_CACHE_KEY);
    if (!entriesString) {
      return [];
    }

    const entries = JSON.parse(entriesString as string);
    return entries || [];
  } catch (e) {
    console.error("Error getting all time entries from LocalStorage:", e);
    return [];
  }
}

export async function getProjects({ onError }: { onError?: (state: boolean) => void } = {}): Promise<Project[]> {
  const workspaceId = await LocalStorage.getItem("workspaceId");

  const { data, error } = await fetcher(`/workspaces/${workspaceId}/projects?page-size=1000&archived=false`);
  if (error === "Unauthorized") {
    onError && onError(false);
    return [];
  }

  if (data?.length) {
    cache.set(PROJECTS_CACHE_KEY, JSON.stringify(data));
    return data;
  } else {
    return [];
  }
}

export async function getTasksForProject(projectId: string): Promise<Task[]> {
  const workspaceId = await LocalStorage.getItem("workspaceId");
  const cacheKey = `project[${projectId}]`;

  const { data, error } = await fetcher(`/workspaces/${workspaceId}/projects/${projectId}/tasks?page-size=1000`);
  if (error) {
    showFailureToast(error, { title: "Could not fetch tasks" });
    console.error("Error fetching tasks:", error);
    return [];
  }

  if (data?.length) {
    cache.set(cacheKey, JSON.stringify(data));
    return data;
  } else {
    return [];
  }
}

export async function addNewTimeEntry(
  description: string | undefined | null,
  projectId: string,
  taskId: string | undefined | null,
  callback?: () => void,
): Promise<void> {
  showToast(Toast.Style.Animated, "Starting…");

  const workspaceId = await LocalStorage.getItem("workspaceId");
  const { data, error } = await fetcher(`/workspaces/${workspaceId}/time-entries`, {
    method: "POST",
    body: {
      description,
      taskId,
      projectId,
      timeInterval: {
        start: new Date().toISOString(),
        end: null,
        duration: null,
      },
      customFieldValues: [],
    },
  });

  if (!error && data?.id) {
    showToast(Toast.Style.Success, "Timer is running");

    // Update the cache directly or call the callback to refetch
    try {
      const entriesString = cache.get(TIME_ENTRIES_CACHE_KEY);
      if (entriesString) {
        const entries = JSON.parse(entriesString as string);
        // Add the new entry to the beginning of the array
        entries.unshift(data);
        cache.set(TIME_ENTRIES_CACHE_KEY, JSON.stringify(entries));
      }
    } catch (e) {
      console.error("Error updating cache:", e);
    }

    // Call the callback if provided to refetch the time entries
    if (callback) {
      callback();
    }
  } else {
    showToast(Toast.Style.Failure, "Timer could not be started");
  }
}
