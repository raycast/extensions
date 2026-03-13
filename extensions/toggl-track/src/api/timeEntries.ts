import { execFile } from "child_process";

import { get, post, patch, put, remove } from "@/api/togglClient";
import type { ToggleItem } from "@/api/types";
import { extensionStartScript, extensionStopScript, extensionUpdateScript } from "@/helpers/preferences";

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
  const timeEntries = await get<(Meta extends false ? TimeEntry : TimeEntry & TimeEntryMetaData)[]>(
    `/me/time_entries?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&meta=${includeMetadata ?? false}`,
  );
  return timeEntries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export async function getRunningTimeEntry() {
  const result = await get<TimeEntry | null>("/me/time_entries/current");
  if (extensionUpdateScript) {
    runTrigger(extensionUpdateScript, result);
  }
  return result;
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
  const response = await post<{ data: TimeEntry }>(`/workspaces/${workspaceId}/time_entries`, {
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
  if (response.data && extensionStartScript) {
    runTrigger(extensionStartScript, response.data);
  }
  return response;
}

export async function stopTimeEntry({ id, workspaceId }: { id: number; workspaceId: number }) {
  const response = await patch<{ data: TimeEntry }>(`/workspaces/${workspaceId}/time_entries/${id}/stop`, {});
  if (response.data && extensionStopScript) {
    runTrigger(extensionStopScript, response.data);
  }
  return response;
}

export function removeTimeEntry(workspaceId: number, timeEntryId: number) {
  return remove(`/workspaces/${workspaceId}/time_entries/${timeEntryId}`);
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

export function updateTimeEntry(workspaceId: number, timeEntryId: number, params: UpdateTimeEntryParams) {
  return put<TimeEntry>(`/workspaces/${workspaceId}/time_entries/${timeEntryId}`, params);
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
