import { get, post, patch } from "./togglClient";

export async function getTimeEntries({ startDate, endDate }: { startDate: Date; endDate: Date }) {
  const timeEntries = await get<TimeEntry[]>(
    `/me/time_entries?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
  );
  return timeEntries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function getRunningTimeEntry() {
  return get<TimeEntry | null>("/me/time_entries/current");
}

type CreateTimeEntryParameters = {
  projectId?: number;
  workspaceId: number;
  description: string;
  tags: string[];
  taskId?: number;
  billable: boolean;
};
export function createTimeEntry({
  projectId,
  workspaceId,
  description,
  tags,
  taskId,
  billable,
}: CreateTimeEntryParameters) {
  const now = new Date();
  return post<{ data: TimeEntry }>(`/workspaces/${workspaceId}/time_entries`, {
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
}

export function stopTimeEntry({ id, workspaceId }: { id: number; workspaceId: number }) {
  return patch<{ data: TimeEntry }>(`/workspaces/${workspaceId}/time_entries/${id}/stop`, {});
}

// https://developers.track.toggl.com/docs/api/time_entries#response
export interface TimeEntry {
  at: string;
  billable: boolean;
  description: string;
  id: number;
  project_id: number;
  start: string;
  duration: number;
  tags: string[];
  workspace_id: number;
}
