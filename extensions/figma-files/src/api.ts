import { Toast, environment, getPreferenceValues, showToast } from "@raycast/api";
import { getAccessToken } from "@raycast/utils";
import type {
  File,
  FileDetail,
  FolderFiles,
  FolderFilesResponse,
  FolderSource,
  TeamFiles,
  TeamFolders,
  TeamProjects,
} from "./types";
import {
  type RefreshTimes,
  isFresh,
  loadFiles,
  loadRefreshTimes,
  markFresh,
  saveRefreshTimes,
  storeFiles,
} from "./cache";

interface RequestError extends Error {
  response?: Response;
}

// Figma allows as few as 5 requests per minute on the folder endpoints for View and Collab seats,
// so keep only a few requests in flight and wait out 429s instead of failing the whole refresh.
const MAX_CONCURRENT_REQUESTS = 3;
const MAX_RETRIES = 6;
// Give up instead of hanging the command when Figma asks us to wait longer than this
const MAX_RETRY_WAIT_SECONDS = 90;
// Slowest pace we throttle down to, matching the 5 requests per minute of the lowest tier
const MAX_REQUEST_INTERVAL_MS = 12_000;

// Utility function for retry delays
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let activeRequests = 0;
const requestQueue: (() => void)[] = [];

async function acquireRequestSlot() {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return;
  }
  await new Promise<void>((resolve) => requestQueue.push(resolve));
}

// After a 429 every request is spaced out by Figma's Retry-After, so parallel requests stop colliding
let requestIntervalMs = 0;
let nextRequestAt = 0;
let pausedUntil = 0;

async function waitForRequestTurn() {
  const now = Date.now();
  const startAt = Math.max(now, nextRequestAt);
  nextRequestAt = startAt + requestIntervalMs;
  if (startAt > now) await sleep(startAt - now);
  // Another request may have hit a 429 while this one was waiting
  while (Date.now() < pausedUntil) await sleep(pausedUntil - Date.now());
}

function slowDown(retryAfterSec: number) {
  const retryAfterMs = retryAfterSec * 1000;
  requestIntervalMs = Math.min(Math.max(requestIntervalMs, retryAfterMs), MAX_REQUEST_INTERVAL_MS);
  pausedUntil = Math.max(pausedUntil, Date.now() + retryAfterMs);
  nextRequestAt = Math.max(nextRequestAt, pausedUntil);
}

function releaseRequestSlot() {
  const next = requestQueue.shift();
  if (next) {
    next();
  } else {
    activeRequests--;
  }
}

async function readErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { message?: string; err?: string };
    return body.message ?? body.err;
  } catch {
    return undefined;
  }
}

function createRequestError(message: string, response: Response): RequestError {
  const error: RequestError = new Error(message);
  error.response = response;
  return error;
}

function hasStatus(error: unknown, ...statuses: number[]): boolean {
  const status = (error as RequestError | undefined)?.response?.status;
  return status !== undefined && statuses.includes(status);
}

async function request<T>(path: string): Promise<T> {
  const { PERSONAL_ACCESS_TOKEN } = getPreferenceValues();
  const { token, type } = getAccessToken();

  await acquireRequestSlot();
  try {
    let attempts = 0;

    while (true) {
      await waitForRequestTurn();
      const response = await fetch(`https://api.figma.com${path}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(type === "oauth" ? { Authorization: `Bearer ${token}` } : { "X-Figma-Token": PERSONAL_ACCESS_TOKEN }),
        },
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      // Handle rate limiting (429 errors)
      if (response.status === 429) {
        // Use retry-after header if available, otherwise exponential backoff
        const retryAfterSec = Number(response.headers.get("retry-after")) || Math.min(2 ** attempts, 60);
        if (attempts++ >= MAX_RETRIES || retryAfterSec > MAX_RETRY_WAIT_SECONDS) {
          throw createRequestError(`Figma rate limit reached. Try again in ${retryAfterSec} seconds.`, response);
        }
        slowDown(retryAfterSec);
        continue;
      }

      const message = await readErrorMessage(response);

      // 403 means an invalid or expired token, or a token without the scope this endpoint needs
      if (response.status === 403) {
        throw createRequestError(
          `Figma denied access${message ? `: ${message}` : ""}. Check that your token is valid and has the folders:read scope.`,
          response,
        );
      }

      // Handle other HTTP errors
      throw createRequestError(
        `Request failed: ${response.status}${message ? `: ${message}` : `: ${response.statusText}`}`,
        response,
      );
    }
  } finally {
    releaseRequestSlot();
  }
}

type FolderEntry = Omit<FolderFiles, "files">;

type FolderTree = {
  name: string;
  source: FolderSource;
  folders: FolderEntry[];
  // False when some subfolder listings failed and cached subfolders were used in their place
  complete: boolean;
};

function getTeamIds(): string[] {
  const { TEAM_ID } = getPreferenceValues();
  return (TEAM_ID as string)
    .split(",")
    .map((team) => team.trim())
    .filter(Boolean);
}

function toFolderEntry(folder: FolderFiles): FolderEntry {
  return { id: folder.id, name: folder.name, path: folder.path, parentId: folder.parentId };
}

// All cached folders below `parentId`, used when a subfolder listing fails
function cachedDescendants(cachedTeam: TeamFiles | undefined, parentId: string): FolderEntry[] {
  if (!cachedTeam) return [];

  const descendants: FolderEntry[] = [];
  const parents = [parentId];
  while (parents.length > 0) {
    const current = parents.shift();
    for (const folder of cachedTeam.folders) {
      if (folder.parentId === current) {
        descendants.push(toFolderEntry(folder));
        parents.push(folder.id);
      }
    }
  }
  return descendants;
}

// Orders folders so each folder is followed by its subfolders, keeping Figma's order among siblings
function orderFolders(folders: FolderEntry[]): FolderEntry[] {
  const ids = new Set(folders.map((folder) => folder.id));
  const childrenByParent = new Map<string | null, FolderEntry[]>();
  for (const folder of folders) {
    const parentId = folder.parentId && ids.has(folder.parentId) ? folder.parentId : null;
    childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), folder]);
  }

  const ordered: FolderEntry[] = [];
  const seen = new Set<string>();
  const visit = (parentId: string | null) => {
    for (const child of childrenByParent.get(parentId) ?? []) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      ordered.push(child);
      visit(child.id);
    }
  };
  visit(null);
  return ordered;
}

type TeamInfo = Pick<FolderTree, "name" | "source">;

// `onFolders` is called as soon as folders are discovered, so their files can load while the walk continues
async function fetchFolderTree(
  teamId: string,
  cachedTeam: TeamFiles | undefined,
  onFolders: (team: TeamInfo, folders: FolderEntry[]) => void,
): Promise<FolderTree> {
  let topLevel: TeamFolders;
  try {
    topLevel = await request<TeamFolders>(`/v2/teams/${teamId}/folders`);
  } catch (error) {
    // Tokens without folders:read (including the OAuth login) and plans without nested folders
    // can't use the v2 endpoints. The legacy projects API still lists top-level folders.
    if (!hasStatus(error, 403, 404)) throw error;

    const legacy = await request<TeamProjects>(`/v1/teams/${teamId}/projects`);
    const team: TeamInfo = { name: legacy.name, source: "v1" };
    const folders = (legacy.projects ?? []).map((project) => ({
      id: String(project.id),
      name: project.name,
      path: project.name,
      parentId: null,
    }));
    onFolders(team, folders);
    return { ...team, folders, complete: true };
  }

  const team: TeamInfo = { name: topLevel.name, source: "v2" };

  const folders: FolderEntry[] = [];
  const visited = new Set<string>();
  let complete = true;
  let level: FolderEntry[] = (topLevel.folders ?? []).map((folder) => ({
    id: String(folder.id),
    name: folder.name,
    path: folder.name,
    parentId: null,
  }));

  // Figma only lists direct subfolders, so walk the tree one level at a time
  while (level.length > 0) {
    level = level.filter((folder) => !visited.has(folder.id));
    level.forEach((folder) => visited.add(folder.id));
    folders.push(...level);
    onFolders(team, level);

    const children = await Promise.all(
      level.map(async (parent) => {
        try {
          const result = await request<TeamFolders>(`/v2/folders/${parent.id}/folders`);
          return (result.folders ?? []).map((folder) => ({
            id: String(folder.id),
            name: folder.name,
            path: `${parent.path} / ${folder.name}`,
            parentId: parent.id,
          }));
        } catch (error) {
          console.error(`Could not load subfolders of "${parent.path}"`, error);
          complete = false;
          // Keep what we knew about this branch of the tree; it is retried on the next refresh
          const known = cachedDescendants(cachedTeam, parent.id).filter((folder) => !visited.has(folder.id));
          known.forEach((folder) => visited.add(folder.id));
          folders.push(...known);
          onFolders(team, known);
          return [];
        }
      }),
    );
    level = children.flat();
  }

  return { ...team, folders: orderFolders(folders), complete };
}

async function fetchFolderFiles(folderId: string, source: FolderSource) {
  const path =
    source === "v2"
      ? `/v2/folders/${folderId}/files?branch_data=false`
      : `/v1/projects/${folderId}/files?branch_data=false`;
  const result = await request<FolderFilesResponse>(path);
  return result.files ?? [];
}

async function refreshTeam(
  teamId: string,
  cachedTeam: TeamFiles | undefined,
  times: RefreshTimes,
  failures: unknown[],
  onProgress: (team: TeamFiles) => void,
): Promise<TeamFiles> {
  const treeKey = `team:${teamId}`;
  const cachedFolders = new Map(cachedTeam?.folders.map((folder) => [folder.id, folder]));
  // Files known so far, by folder ID: fetched in this refresh, or reused from the cache while still fresh
  const filesByFolder = new Map<string, File[]>();
  const fileRequests: Promise<void>[] = [];
  const discovered: FolderEntry[] = [];
  let team: TeamInfo | undefined;

  // Until the refresh finishes, a cached team keeps its folders and only gets new file lists patched in.
  // A team loaded for the first time shows each folder as soon as its files arrive.
  const snapshot = (): TeamFiles | undefined => {
    if (cachedTeam) {
      return {
        ...cachedTeam,
        folders: cachedTeam.folders.map((folder) => ({
          ...folder,
          files: filesByFolder.get(folder.id) ?? folder.files,
        })),
      };
    }
    if (!team) return undefined;
    return {
      id: teamId,
      ...team,
      folders: orderFolders(discovered).flatMap((folder) => {
        const files = filesByFolder.get(folder.id);
        return files ? [{ ...folder, files }] : [];
      }),
    };
  };
  const reportProgress = () => {
    const current = snapshot();
    if (current) onProgress(current);
  };

  const loadFolderFiles = (folder: FolderEntry, source: FolderSource) => {
    const cachedFolder = cachedFolders.get(folder.id);
    // After switching between the v1 and v2 APIs (e.g. a token with folders:read was added), refetch every folder
    if (cachedFolder && cachedTeam?.source === source && isFresh(times, folder.id)) {
      filesByFolder.set(folder.id, cachedFolder.files);
      return;
    }

    fileRequests.push(
      fetchFolderFiles(folder.id, source).then(
        (files) => {
          filesByFolder.set(folder.id, files);
          markFresh(times, folder.id);
          reportProgress();
        },
        (error) => {
          // Failures are isolated per folder: a folder that fails keeps its cached files and is retried next time
          console.error(`Could not load files in "${folder.path}"`, error);
          failures.push(error);
          delete times[folder.id];
          filesByFolder.set(folder.id, cachedFolder?.files ?? []);
        },
      ),
    );
  };

  let tree: FolderTree;
  // A tree reused from the cache must not renew its own timestamp, or it would never be refetched
  let fetchedTree = false;
  if (cachedTeam && isFresh(times, treeKey)) {
    tree = {
      name: cachedTeam.name,
      source: cachedTeam.source,
      folders: cachedTeam.folders.map(toFolderEntry),
      complete: true,
    };
    tree.folders.forEach((folder) => loadFolderFiles(folder, tree.source));
  } else {
    try {
      tree = await fetchFolderTree(teamId, cachedTeam, (info, folders) => {
        team = info;
        discovered.push(...folders);
        folders.forEach((folder) => loadFolderFiles(folder, info.source));
      });
      fetchedTree = true;
    } catch (error) {
      await Promise.all(fileRequests);
      if (!cachedTeam) throw error;
      console.error(`Could not refresh folders of team ${teamId}, using cached folders`, error);
      failures.push(error);
      return snapshot() ?? cachedTeam;
    }
    if (!tree.complete) {
      failures.push(new Error("Some subfolders could not be loaded."));
    }
  }

  await Promise.all(fileRequests);

  const result: TeamFiles = {
    id: teamId,
    name: tree.name,
    source: tree.source,
    folders: tree.folders.map((folder) => ({ ...folder, files: filesByFolder.get(folder.id) ?? [] })),
  };
  // Mark the tree fresh and hand over the complete folder list in the same step. Progress saves for other
  // teams still loading would otherwise pair a fresh tree with this team's partial or old folder list.
  if (fetchedTree && tree.complete) {
    markFresh(times, treeKey);
  }
  onProgress(result);
  return result;
}

// How often partial results are shown and saved while a refresh is running
const PROGRESS_INTERVAL_MS = 1000;

export async function resolveAllFiles(onProgress?: (teams: TeamFiles[]) => void): Promise<TeamFiles[]> {
  const teamIds = getTeamIds();
  const cachedTeams = (await loadFiles()) ?? [];
  const times = await loadRefreshTimes();
  const failures: unknown[] = [];

  // Partial results are saved as they come in, so closing Raycast mid-refresh doesn't lose them
  const latest = new Map(cachedTeams.map((team) => [team.id, team]));
  // Show what an interrupted earlier refresh already saved right away
  onProgress?.(teamIds.flatMap((teamId) => latest.get(teamId) ?? []));
  let lastProgressAt = 0;
  let saving = Promise.resolve();
  const save = () => {
    const teams = teamIds.flatMap((teamId) => latest.get(teamId) ?? []);
    const timesSnapshot = { ...times };
    saving = saving
      .then(() => Promise.all([storeFiles(teams), saveRefreshTimes(timesSnapshot)]))
      .then(() => undefined)
      .catch((error) => console.error("Could not save files", error));
    return teams;
  };
  const handleProgress = (team: TeamFiles) => {
    latest.set(team.id, team);
    if (Date.now() - lastProgressAt < PROGRESS_INTERVAL_MS) return;
    lastProgressAt = Date.now();
    onProgress?.(save());
  };

  const results = await Promise.allSettled(
    teamIds.map((teamId) =>
      refreshTeam(
        teamId,
        cachedTeams.find((team) => team.id === teamId),
        times,
        failures,
        handleProgress,
      ),
    ),
  );

  latest.clear();
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      latest.set(teamIds[index], result.value);
    } else {
      console.error(result.reason);
      failures.push(result.reason);
    }
  });

  // Teams removed from the preferences and folders that no longer exist are dropped here
  const teams = save();
  await saving;

  if (failures.length > 0 && environment.launchType !== "background") {
    const [first] = failures;
    showToast(
      Toast.Style.Failure,
      teams.length > 0 ? "Some files could not be refreshed" : "Could not load files",
      first instanceof Error ? first.message : undefined,
    );
  }

  return teams;
}

export async function fetchPages(fileKey: string) {
  try {
    const result = await request<FileDetail>(`/v1/files/${fileKey}?depth=1`);
    return result.document.children;
  } catch (error) {
    console.error(error);
    if (environment.launchType !== "background") {
      showToast(Toast.Style.Failure, "Could not load pages (Figma Slides not supported)");
    }
    return Promise.resolve([]);
  }
}
