import { Cache, LaunchType, LocalStorage, Toast, environment, getPreferenceValues, showToast } from "@raycast/api";
import { createHash } from "crypto";
import uniqWith from "lodash.uniqwith";
import { FetcherArgs, FetcherResponse, TimeEntry, Project, Task, User, Workspace } from "./types";
import { showFailureToast } from "@raycast/utils";

const cache = new Cache();

/**
 * Cache keys are scoped to the configured account.
 *
 * `Cache` is never cleared, and `LocalStorage.clear()` only runs when a token is *rejected* —
 * swapping to a different valid token clears nothing. With unscoped keys, one account's cached
 * entries could therefore be read, and offered as things to click, while signed in as another. Since
 * project ids are workspace-bound Clockify rejected the resulting request rather than writing to the
 * wrong place, but it was still the previous account's data on screen.
 *
 * The scope is a truncated SHA-256 of the API key: derived synchronously, so the caches can still be
 * read during render for an immediate first paint, and not reversible back to the key. Switching
 * accounts moves to a different set of keys rather than clearing the old ones, so there is no
 * invalidation step to forget.
 *
 * Resolved lazily rather than at module scope so that unreadable preferences degrade to a shared
 * scope instead of preventing the command from loading at all.
 */
let accountScopeMemo: string | undefined;

function accountScope(): string {
  if (accountScopeMemo === undefined) {
    let token = "";

    try {
      token = getPreferenceValues<Preferences>().token ?? "";
    } catch {
      // Preferences not readable yet; a shared scope beats failing to load.
    }

    accountScopeMemo = createHash("sha256").update(token).digest("hex").slice(0, 12);
  }

  return accountScopeMemo;
}

const timeEntriesCacheKey = () => `clockify/${accountScope()}/timeEntries`;
const timeEntriesRefreshedAtCacheKey = () => `clockify/${accountScope()}/timeEntriesRefreshedAt`;
const projectsCacheKey = () => `clockify/${accountScope()}/projects`;
const activeEntryCacheKey = () => `clockify/${accountScope()}/activeEntry`;
const tasksCacheKey = (projectId: string) => `clockify/${accountScope()}/project[${projectId}]`;

/**
 * Shows a toast, unless the command cannot show one.
 *
 * `showToast` throws "Toast API is not available when command is launched in background", and the
 * menu-bar command is *always* launched in the background — its 10s interval, not a user opening it.
 * Clicking one of its items does not change that. Because both stopCurrentTimer() and
 * addNewTimeEntry() opened with a toast, the throw aborted them on their first line and the request
 * was never sent: "Stop Timer" and the recent-timer restarts silently did nothing at all.
 *
 * So every toast in this file goes through here. Losing the toast is fine — in the menu bar the
 * updated title is the feedback — but losing the API call is not.
 */
function notify(style: Toast.Style, title: string, message?: string): void {
  if (environment.launchType === LaunchType.Background) return;

  // Also swallow rejections: this is feedback, and it must never be able to abort its caller.
  showToast(style, title, message).catch(() => undefined);
}

/** showFailureToast equivalent of notify(); see the note there on background launches. */
export function notifyFailure(error: unknown, title: string): void {
  if (environment.launchType === LaunchType.Background) return;

  showFailureToast(error, { title });
}

// https://clockify.me/help/getting-started/data-regions
const getApiUrl = (region: Preferences["region"]): string => {
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
  const preferences = getPreferenceValues<Preferences>();
  const token = preferences.token;
  const apiURL = getApiUrl(preferences.region);

  try {
    const response = await fetch(`${apiURL}${url}`, {
      headers: { "X-Api-Key": token, "Content-Type": "application/json", ...headers },
      method: method || "GET",
      body: body ? JSON.stringify(body) : undefined,
      ...args,
    });

    if (response.ok) {
      const data = await response.json();
      return { data };
    } else {
      if (response.status === 401) {
        LocalStorage.clear();
        notify(Toast.Style.Failure, "Invalid API Key detected");
      }

      return { error: response.statusText };
    }
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Picks the workspace to operate on. `defaultWorkspace` is not guaranteed to be present, so fall
 * back to the active workspace and then to the first workspace this token can see.
 *
 * Single implementation on purpose: both useConfig and resolveConfig need this chain, and two
 * copies would be free to drift apart.
 *
 * Returns the error separately so callers can tell "this account has no workspace" apart from
 * "the request failed"; the two need different messages.
 */
export async function resolveWorkspaceId(
  user: User | undefined,
): Promise<{ workspaceId?: string; error?: string | Error }> {
  const fromUser = user?.defaultWorkspace || user?.activeWorkspace;
  if (fromUser) return { workspaceId: fromUser };

  const { data, error } = await fetcher(`/workspaces`);
  if (error) return { error };

  return { workspaceId: (data as Workspace[] | undefined)?.[0]?.id };
}

/**
 * Resolves the workspace and user ids that every request needs.
 *
 * These are written by useConfig, but a resolved `LocalStorage.setItem` does not guarantee the key
 * is readable yet: when several writes are issued concurrently — useConfig can bootstrap from more
 * than one mounted component at once — a key can be lost, and callers then request
 * /workspaces/undefined/... which Clockify rejects with "User doesn't belong to Workspace".
 *
 * So treat LocalStorage as a cache rather than the source of truth: if either id is missing,
 * re-derive it from /user and repair the stored copy with sequential writes.
 */
export async function resolveConfig(): Promise<{ workspaceId?: string; userId?: string }> {
  const [storedWorkspaceId, storedUserId] = await Promise.all([
    LocalStorage.getItem<string>("workspaceId"),
    LocalStorage.getItem<string>("userId"),
  ]);

  if (storedWorkspaceId && storedUserId) {
    return { workspaceId: storedWorkspaceId, userId: storedUserId };
  }

  const { data } = await fetcher(`/user`);
  const user = data as User | undefined;

  const workspaceId = storedWorkspaceId || (await resolveWorkspaceId(user)).workspaceId;
  const userId = storedUserId || user?.id;

  if (workspaceId) await LocalStorage.setItem("workspaceId", workspaceId);
  if (userId) await LocalStorage.setItem("userId", userId);

  return { workspaceId, userId };
}

export function validateToken(): boolean {
  const preferences = getPreferenceValues<Preferences>();
  const token = preferences.token;

  // Guard before reading .length: this runs inside a useState initializer, so if the preference is
  // ever absent the throw happens during render and takes the whole command down rather than
  // showing the recoverable invalid-key state.
  if (!token || token.length !== 48) {
    notify(Toast.Style.Failure, "Invalid API Key detected");
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
  const { workspaceId, userId } = await resolveConfig();

  const { data, error } = await fetcher(
    `/workspaces/${workspaceId}/user/${userId}/time-entries?hydrated=true&page-size=500`,
  );

  if (error === "Unauthorized") {
    onError?.(false);
    return [];
  }

  if (data?.length) {
    const filteredEntries: TimeEntry[] = uniqWith(
      data,
      (a: TimeEntry, b: TimeEntry) =>
        a.projectId === b.projectId && a.taskId === b.taskId && a.description === b.description,
    );
    cache.set(timeEntriesCacheKey(), JSON.stringify(filteredEntries));
    markTimeEntriesRefreshed();

    return filteredEntries;
  } else {
    // An account with no entries answers successfully with an empty list. Record that as a refresh —
    // otherwise timeEntriesCacheAge() stays at Infinity and the menu bar asks again every 10 seconds
    // forever — and empty the cached list too, so a previously cached set does not keep being shown
    // for entries that no longer exist.
    //
    // Both only on a successful array response: a failed request has to be retried, not mistaken for
    // an account with no entries.
    if (!error && Array.isArray(data)) {
      cache.set(timeEntriesCacheKey(), JSON.stringify([]));
      markTimeEntriesRefreshed();
    }

    return [];
  }
}

function markTimeEntriesRefreshed(): void {
  cache.set(timeEntriesRefreshedAtCacheKey(), String(Date.now()));
}

/**
 * How long ago this list was last refreshed from Clockify, in milliseconds, or Infinity if it never
 * has been.
 *
 * Exists so the menu bar can decide whether a refresh is worth paying for: the request above returns
 * 500 hydrated entries — roughly 1.2MB and three seconds — which is far too expensive to repeat on a
 * 10-second interval. Counted from the last refresh by *either* command, so opening the time-tracking
 * view also satisfies the menu bar.
 *
 * Deliberately measures the fetch, not the cache contents: stopCurrentTimer() and addNewTimeEntry()
 * amend the cached list in place without refetching, and those edits should not pass for freshness.
 *
 * Reports Infinity for anything it cannot make sense of — never fetched, an unparseable value, or a
 * timestamp in the future — so the caller's single "too old?" comparison covers those cases without
 * needing to know about them.
 */
export function timeEntriesCacheAge(): number {
  const stored = cache.get(timeEntriesRefreshedAtCacheKey());
  if (!stored) return Infinity;

  const refreshedAt = Number(stored);
  if (!Number.isFinite(refreshedAt)) return Infinity;

  const age = Date.now() - refreshedAt;

  // A negative age means the clock has moved backwards since the timestamp was written — an NTP
  // correction, or a machine whose clock was simply wrong until it was fixed. Only wall-clock time
  // survives between these processes, so there is no monotonic source to compare against instead;
  // reporting it as stale is the safe reading. Treating it as fresh would freeze the list until the
  // clock caught back up, whereas one refresh rewrites the timestamp against the corrected clock and
  // the anomaly resolves itself.
  return age < 0 ? Infinity : age;
}

export async function stopCurrentTimer(callback?: () => void): Promise<void> {
  notify(Toast.Style.Animated, "Stopping…");

  const { workspaceId, userId } = await resolveConfig();

  const { data, error } = await fetcher(`/workspaces/${workspaceId}/user/${userId}/time-entries`, {
    method: "PATCH",
    body: { end: new Date().toISOString() },
  });

  if (!error && data) {
    notify(Toast.Style.Success, "Timer stopped");

    // Keep the active-timer cache in step, so the next menu-bar process doesn't paint a timer that
    // has just been stopped.
    cacheActiveTimeEntry(null);

    // Update the cache directly or call the callback to refetch
    try {
      const entriesString = cache.get(timeEntriesCacheKey());
      if (entriesString) {
        const entries: TimeEntry[] = JSON.parse(entriesString as string);
        if (entries && entries.length > 0) {
          // Find and update the active entry
          const activeEntryIndex = entries.findIndex((entry) => !entry.timeInterval.end);
          if (activeEntryIndex !== -1) {
            entries[activeEntryIndex].timeInterval.end = new Date().toISOString();
            cache.set(timeEntriesCacheKey(), JSON.stringify(entries));
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
    notify(Toast.Style.Failure, "No timer running");
  }
}

/**
 * Fetches the running timer from Clockify rather than inferring it from the cache.
 *
 * `in-progress=true` is a real server-side filter, verified empirically — unlike the `projectId`
 * filter on this same endpoint, which Clockify silently ignores. Hydrated it costs ~2.4KB against
 * ~1.2MB for the 500-entry list, so it is cheap enough to run on every menu-bar invocation.
 *
 * The three return values are distinct on purpose:
 *   - a TimeEntry — that timer is running
 *   - null        — nothing is running, confirmed by the API (the endpoint returns `[]`)
 *   - undefined   — could not tell, so callers should leave whatever they are showing alone
 *                   instead of flashing "No Timer" on a transient network error.
 *
 * Deliberately does *not* write the cache. The answer is only true as of when the request was
 * issued, and the caller may have changed the timer since — so persisting is the caller's decision,
 * via cacheActiveTimeEntry(), once it knows the result has not been superseded.
 */
export async function fetchActiveTimeEntry(): Promise<TimeEntry | null | undefined> {
  const { workspaceId, userId } = await resolveConfig();

  const { data, error } = await fetcher(
    `/workspaces/${workspaceId}/user/${userId}/time-entries?in-progress=true&hydrated=true`,
  );

  if (error || !Array.isArray(data)) return undefined;

  // Don't take the filter purely on trust: only treat the entry as running if it really has no end.
  const entry = (data as TimeEntry[])[0];
  return entry && isInProgress(entry) ? entry : null;
}

/**
 * Remembers what the API last said about the running timer.
 *
 * The menu-bar command is a fresh process every 10 seconds, so its first paint has to come from a
 * cache. Deriving it from the deduplicated entries list cannot see a timer started outside this
 * extension, which made the title read "No Timer" until the API answered ~200ms later — a visible
 * flash on every single invocation. Storing the answer directly means the next process starts from
 * what Clockify actually reported.
 *
 * `null` is stored explicitly, and is distinct from the key being absent: "confirmed nothing is
 * running" must not be mistaken for "never asked".
 */
export function cacheActiveTimeEntry(entry: TimeEntry | null): void {
  try {
    cache.set(activeEntryCacheKey(), JSON.stringify(entry));
  } catch (e) {
    console.error("Error caching active time entry:", e);
  }
}

/**
 * Last known running timer, for an immediate first paint.
 *
 * Falls back to scanning the entries list when this has never been written, so a cold cache behaves
 * as it did before rather than claiming nothing is running.
 */
export function getCachedActiveTimeEntry(): TimeEntry | null {
  try {
    const stored = cache.get(activeEntryCacheKey());
    if (stored === undefined) return getCurrentlyActiveTimeEntry();

    const entry = JSON.parse(stored) as TimeEntry | null;
    return entry && isInProgress(entry) ? entry : null;
  } catch (e) {
    console.error("Error reading cached active time entry:", e);
    return null;
  }
}

export function getCurrentlyActiveTimeEntry(): TimeEntry | null {
  try {
    const entriesString = cache.get(timeEntriesCacheKey());
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
    const entriesString = cache.get(timeEntriesCacheKey());
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

export async function getTodayTotalTimeForProject(projectId: string): Promise<number> {
  try {
    const { workspaceId, userId } = await resolveConfig();

    // Get today's date range in ISO format
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch today's entries from API
    // Note: page-size=500 limits to 500 entries per day. For users with heavy tracking,
    // this could be insufficient. Consider implementing pagination if needed.
    // The API projectId filter doesn't work correctly, so we filter client-side.
    const { data, error } = await fetcher(
      `/workspaces/${workspaceId}/user/${userId}/time-entries?` +
        `start=${today.toISOString()}&` +
        `end=${tomorrow.toISOString()}&` +
        `projectId=${projectId}&` +
        `hydrated=true&` +
        `page-size=500`,
    );

    if (error || !data) {
      console.error("Error fetching today's entries:", error);
      return 0;
    }

    // Filter by projectId since API parameter doesn't work correctly
    const filteredData = data.filter((entry: TimeEntry) => entry.projectId === projectId);

    let totalMs = 0;

    for (const entry of filteredData) {
      // Skip the currently running entry; its elapsed time is added live in the UI
      if (!entry.timeInterval.end) continue;
      const entryStart = new Date(entry.timeInterval.start);
      const entryEnd = new Date(entry.timeInterval.end);
      totalMs += entryEnd.getTime() - entryStart.getTime();
    }

    return totalMs;
  } catch (e) {
    console.error("Error calculating today's total time:", e);
    return 0;
  }
}

export function millisecondsToDurationString(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export async function getProjects({ onError }: { onError?: (state: boolean) => void } = {}): Promise<Project[]> {
  const { workspaceId } = await resolveConfig();

  const { data, error } = await fetcher(`/workspaces/${workspaceId}/projects?page-size=1000&archived=false`);
  if (error === "Unauthorized") {
    onError?.(false);
    return [];
  }

  if (data?.length) {
    cache.set(projectsCacheKey(), JSON.stringify(data));
    return data;
  } else {
    return [];
  }
}

/**
 * Looks a project up in whichever cache holds it.
 *
 * There are two, written by independent code paths: the forms in index.tsx cache the project list
 * in LocalStorage under "projects", and getProjects() caches it in Cache under clockify/projects.
 * Both are checked so that a list fetched by either path is reused. LocalStorage comes first only
 * because the forms rewrite it on every mount, making it the more recently refreshed of the two.
 */
async function findCachedProject(projectId: string): Promise<Project | undefined> {
  let stored: string | undefined;

  try {
    stored = await LocalStorage.getItem<string>("projects");
  } catch (e) {
    console.error("Error reading cached projects:", e);
  }

  for (const source of [stored, cache.get(projectsCacheKey())]) {
    if (!source) continue;

    try {
      const project = (JSON.parse(source) as Project[]).find((project) => project.id === projectId);
      if (project) return project;
    } catch (e) {
      console.error("Error reading cached projects:", e);
    }
  }

  return undefined;
}

/**
 * The project an entry belongs to.
 *
 * Reads the cached project list and only falls back to a request, because a timer can be restarted
 * from a recent entry before any form has loaded projects. getProjects() populates one of the caches
 * findCachedProject() reads, so that fallback primes itself and costs one request rather than one per
 * timer start.
 *
 * Cache-first means a project changed in Clockify web can be stale here until a cache is rewritten,
 * which either form does on mount. Restarting a recent entry does not open a form, so that path can
 * use an older copy. Accepted deliberately: projects change rarely, and always refetching would add a
 * request to every timer start.
 */
async function resolveProject(projectId: string): Promise<Project | undefined> {
  const cached = await findCachedProject(projectId);
  if (cached) return cached;

  const projects = await getProjects();
  return projects.find((project) => project.id === projectId);
}

/**
 * Whether a project is billable by default.
 *
 * Returns undefined when the setting cannot be determined, which callers pass straight into the
 * request body: JSON.stringify drops undefined, so the field is omitted and Clockify's own default
 * applies rather than a guess of ours.
 */
export async function isProjectBillable(projectId: string): Promise<boolean | undefined> {
  return (await resolveProject(projectId))?.billable;
}

export async function getTasksForProject(projectId: string): Promise<Task[]> {
  const { workspaceId } = await resolveConfig();
  const cacheKey = tasksCacheKey(projectId);

  const { data, error } = await fetcher(`/workspaces/${workspaceId}/projects/${projectId}/tasks?page-size=1000`);
  if (error) {
    notifyFailure(error, "Could not fetch tasks");
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
  tagIds: string[] = [],
  startTime?: Date,
): Promise<TimeEntry | null> {
  notify(Toast.Style.Animated, "Starting…");

  const { workspaceId } = await resolveConfig();

  // Resolved once and used twice: for `billable` below, and to fill in the project on the created
  // entry before it is cached.
  const project = await resolveProject(projectId);

  // Clockify defaults billable to false when the field is absent; it does not fall back to the
  // project's "billable by default" setting, so that has to be sent explicitly or every entry
  // lands as non-billable.
  const billable = project?.billable;

  const { data, error } = await fetcher(`/workspaces/${workspaceId}/time-entries`, {
    method: "POST",
    body: {
      start: (startTime || new Date()).toISOString(),
      description,
      taskId,
      projectId,
      tagIds,
      billable,
      customFieldValues: [],
    },
  });

  if (!error && data?.id) {
    notify(Toast.Style.Success, "Timer is running");

    const created = data as TimeEntry;

    // The response to this POST is not hydrated: it carries projectId but no project object. Anything
    // rendering it straight from the cache therefore showed the entry with no project name and an
    // untinted icon — visible in the menu bar's restart list, which is served from that cache. Fill
    // the project in from the copy already resolved above.
    if (!created.project && project) created.project = project;

    // Keep the active-timer cache in step; see cacheActiveTimeEntry.
    cacheActiveTimeEntry(created);

    // Update the cache directly
    try {
      const entriesString = cache.get(timeEntriesCacheKey());
      if (entriesString) {
        const entries = JSON.parse(entriesString as string);
        // Add the new entry to the beginning of the array
        entries.unshift(created);
        cache.set(timeEntriesCacheKey(), JSON.stringify(entries));
      }
    } catch (e) {
      console.error("Error updating cache:", e);
    }

    return created;
  } else {
    // Surface the reason: this toast used to be the extension's only symptom for several distinct
    // failures, which made them very hard to tell apart.
    notify(Toast.Style.Failure, "Timer could not be started", error?.toString());
    return null;
  }
}
