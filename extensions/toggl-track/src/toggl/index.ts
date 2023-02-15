import { Client, Me, Project, Tag, TimeEntry, Workspace } from "./types";
import { getPreferenceValues } from "@raycast/api";
import { authenticatedFetch } from "./auth";

const TogglAPI = function (apiToken: string) {
  const baseUrl = "https://api.track.toggl.com/api/v9";
  const api = authenticatedFetch(apiToken, baseUrl);

  return {
    getMe: (): Promise<Me> => {
      return api.get<Me>("/me");
    },
    getWorkspaces: (): Promise<Workspace[]> => {
      return api.get<Workspace[]>("/workspaces");
    },
    getWorkspaceProjects: async (workspaceId: number): Promise<Project[] | null> => {
      const projects = (await api.get<Project[] | null>(`/workspaces/${workspaceId}/projects?per_page=500`)) || [];
      projects.push({
        id: -1,
        workspace_id: workspaceId,
        client_id: -1,
        name: "No project",
        billable: false,
        color: "",
      });
      return projects;
    },
    createTimeEntry: ({
      projectId,
      workspaceId,
      description,
      tags,
      billable,
    }: {
      projectId?: number;
      workspaceId: number;
      description: string;
      tags: string[];
      billable: boolean;
    }) => {
      const now = new Date();

      return api.post<{ data: TimeEntry }>(`/workspaces/${workspaceId}/time_entries`, {
        billable,
        created_with: "raycast-toggl-track",
        description,
        // For running entries should be -1 * (Unix start time). See https://developers.track.toggl.com/docs/tracking
        duration: Math.floor((-1 * now.getTime()) / 1000),
        project_id: projectId !== -1 ? projectId : undefined,
        start: now.toISOString(),
        tags,
        workspace_id: workspaceId,
      });
    },
    getRunningTimeEntry: async (): Promise<TimeEntry | null> => {
      return api.get<TimeEntry | null>("/me/time_entries/current");
    },
    getWorkspaceClients: (workspaceId: number): Promise<Client[] | null> => {
      return api.get<Client[] | null>(`/workspaces/${workspaceId}/clients`);
    },
    getWorkspaceTags: (workspaceId: number): Promise<Tag[] | null> => {
      return api.get<Tag[] | null>(`/workspaces/${workspaceId}/tags`);
    },
    stopTimeEntry: ({ id, workspaceId }: { id: number; workspaceId: number }) => {
      return api.patch<{ data: TimeEntry }>(`/workspaces/${workspaceId}/time_entries/${id}/stop`, {});
    },
    getTimeEntries: ({ startDate, endDate }: { startDate: Date; endDate: Date }) => {
      return api.get<TimeEntry[]>(
        `/me/time_entries?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`
      );
    },
  };
};

interface Preferences {
  togglApiToken: string;
}

const preferences: Preferences = getPreferenceValues();
const toggl = TogglAPI(preferences.togglApiToken);

export default toggl;
