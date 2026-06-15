import { environment } from "@raycast/api";
import { execFile } from "child_process";

import { get, post, patch, put, remove } from "@/api/togglClient";
import type { ToggleItem } from "@/api/types";
import { cacheHelper } from "@/helpers/cache-helper";
import { extensionStartScript, extensionStopScript, extensionUpdateScript, liteMode } from "@/helpers/preferences";

/** True when API calls should be skipped — LDM or menu bar (which re-renders frequently and must not burn rate limit). */
const cacheOnly = liteMode || environment.commandName === "menuBar";

function runTrigger(scriptPath: string, payload?: TimeEntry | null) {
  if (!scriptPath) return;
  const args = payload ? [JSON.stringify(payload)] : [];
  execFile(scriptPath, args, (error) => {
    if (error) console.error(`Trigger error: ${error}`);
  });
}

export async function getMyTimeEntries<Meta extends boolean = false>({
  startDate,
  endDate,
  includeMetadata,
}: {
  startDate: Date;
  endDate: Date;
  includeMetadata?: Meta;
}): Promise<(Meta extends false ? TimeEntry : TimeEntry & TimeEntryMetaData)[]> {
  type TE = (Meta extends false ? TimeEntry : TimeEntry & TimeEntryMetaData)[];
  if (cacheOnly) {
    const cached = cacheHelper.get<TE>("timeEntries") ?? cacheHelper.getRaw<TE>("timeEntries");
    // Return cached data or empty array — the cold-start sync (or list view) will populate the cache.
    return cached ?? ([] as unknown as TE);
  }
  const timeEntries = await get<TE>(
    `/me/time_entries?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&meta=${includeMetadata ?? false}`,
  );
  const sorted = timeEntries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  cacheHelper.set("timeEntries", sorted);
  return sorted;
}

export async function getRunningTimeEntry() {
  // Toggl POST/PATCH endpoints return tags:null while GET returns tags:[].
  // Normalize on read so stale cache entries with null tags don't crash downstream .map() calls.
  const normalize = (e: TimeEntry): TimeEntry => ({ ...e, tags: e.tags ?? [] });

  const cached = cacheHelper.get<TimeEntry>("runningTimeEntry");
  if (cached) return normalize(cached);

  if (cacheOnly) {
    const stale = cacheHelper.getRaw<TimeEntry>("runningTimeEntry");
    if (stale) return normalize(stale);
    return null;
  }

  const result = await get<TimeEntry | null>("/me/time_entries/current");
  if (result) {
    cacheHelper.set("runningTimeEntry", normalize(result));
  }
  if (extensionUpdateScript) {
    runTrigger(extensionUpdateScript, result);
  }
  return result ? normalize(result) : result;
}

type CreateTimeEntryParameters = {
  projectId?: number;
  workspaceId: number;
  description: string;
  tags: string[];
  taskId?: number;
  billable?: boolean;
};
export async function createTimeEntry({
  projectId,
  workspaceId,
  description,
  tags,
  taskId,
  billable,
}: CreateTimeEntryParameters) {
  const now = new Date();
  // Toggl v9 returns the TimeEntry directly (not wrapped in { data: TimeEntry })
  const response = await post<TimeEntry>(`/workspaces/${workspaceId}/time_entries`, {
    billable,
    created_with: "raycast-toggl-track",
    description,
    // For running entries should be -1 * (Unix start time). See https://developers.track.toggl.com/docs/tracking
    duration: Math.floor((-1 * now.getTime()) / 1000),
    project_id: projectId !== -1 ? projectId : undefined,
    start: now.toISOString(),
    tags,
    workspace_id: workspaceId,
    task_id: taskId,
  });
  if (response) {
    // POST returns tags:null — normalize before caching
    const normalized: TimeEntry = { ...response, tags: response.tags ?? [] };
    cacheHelper.set("runningTimeEntry", normalized);
    // Prepend to timeEntries cache so the running entry has metadata (project color, client name)
    const cachedEntries = cacheHelper.get<TimeEntry[]>("timeEntries") ?? cacheHelper.getRaw<TimeEntry[]>("timeEntries");
    if (cachedEntries) {
      cachedEntries.unshift(normalized);
      cacheHelper.set("timeEntries", cachedEntries);
    }
    if (extensionStartScript) runTrigger(extensionStartScript, normalized);
  }
  return response;
}

export async function stopTimeEntry({ id, workspaceId }: { id: number; workspaceId: number }) {
  // Toggl v9 returns the TimeEntry directly (not wrapped in { data: TimeEntry })
  const response = await patch<TimeEntry>(`/workspaces/${workspaceId}/time_entries/${id}/stop`, {});
  cacheHelper.remove("runningTimeEntry");
  if (response) {
    const normalized: TimeEntry = { ...response, tags: response.tags ?? [] };
    const cached = cacheHelper.get<TimeEntry[]>("timeEntries") ?? cacheHelper.getRaw<TimeEntry[]>("timeEntries") ?? [];
    const idx = cached.findIndex((e) => e.id === normalized.id);
    if (idx !== -1) {
      cached[idx] = normalized;
    } else {
      cached.unshift(normalized);
    }
    cacheHelper.set("timeEntries", cached);
    if (extensionStopScript) runTrigger(extensionStopScript, normalized);
  }
  return response;
}

export async function removeTimeEntry(workspaceId: number, timeEntryId: number) {
  await remove(`/workspaces/${workspaceId}/time_entries/${timeEntryId}`);
  cacheHelper.removeItem("timeEntries", timeEntryId);
}

export interface UpdateTimeEntryParams {
  billable?: boolean;
  created_with?: string;
  description?: string;
  duration?: number;
  duronly?: boolean;
  project_id?: number;
  start?: string;
  stop?: string;
  tag_ids?: number[];
  tags?: string[];
  task_id?: number;
  workspace_id?: number;
}

export async function updateTimeEntry(workspaceId: number, timeEntryId: number, params: UpdateTimeEntryParams) {
  const updated = await put<TimeEntry>(`/workspaces/${workspaceId}/time_entries/${timeEntryId}`, params);
  const normalized: TimeEntry = { ...updated, tags: updated.tags ?? [] };
  // Update the running entry cache if this is the running timer
  const running = cacheHelper.get<TimeEntry>("runningTimeEntry") ?? cacheHelper.getRaw<TimeEntry>("runningTimeEntry");
  if (running && running.id === timeEntryId) {
    cacheHelper.set("runningTimeEntry", normalized);
  }
  const cached = cacheHelper.get<TimeEntry[]>("timeEntries") ?? cacheHelper.getRaw<TimeEntry[]>("timeEntries");
  if (cached) {
    const idx = cached.findIndex((entry) => entry.id === timeEntryId);
    if (idx !== -1) {
      cached[idx] = normalized;
    }
    cacheHelper.set("timeEntries", cached);
  }
  return normalized;
}

// https://developers.track.toggl.com/docs/api/time_entries#response
export interface TimeEntry extends ToggleItem {
  billable: boolean;
  description: string;
  /**
   * Time entry duration.
   *
   * For running entries should be negative, preferable -1
   */
  duration: number;
  /**
   * Used to create a TE with a duration but without a stop time.
   *
   * @deprecated This field is deprecated for GET endpoints where the value will always be true.
   */
  duronly: boolean;
  /**
   * Project ID
   *
   * Can be null if project was not provided or project was later deleted
   */
  project_id: number | null;
  start: string;
  /**
   * Stop time in UTC.
   *
   * Can be null if it's still running or created with "duration" and "duronly" fields.
   */
  stop: string | null;
  tag_ids: number[] | null;
  tags: string[];
  task_id: number | null;
  /** Time Entry creator ID */
  user_id: number;
  workspace_id: number;
}

export interface TimeEntryMetaData {
  client_name?: string;
  project_name?: string;
  project_color?: string;
  project_active?: boolean;
}
