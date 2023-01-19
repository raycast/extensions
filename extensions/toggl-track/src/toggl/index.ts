import { Client, Project, Tag, TimeEntry, Workspace } from "./types";
import { getPreferenceValues } from "@raycast/api";
import { authenticatedFetch } from "./auth";

const TogglAPI = function (apiToken: string) {
  const baseUrl = "https://api.track.toggl.com/api/v8";
  const api = authenticatedFetch(apiToken, baseUrl);

  return {
    getWorkspaces: (): Promise<Workspace[]> => {
      return api.get<Workspace[]>("/workspaces");
    },
    getWorkspaceProjects: async (workspaceId: number): Promise<Project[] | null> => {
      const projects = (await api.get<Project[] | null>(`/workspaces/${workspaceId}/projects`)) || [];
      projects.push({
        id: -1,
        wid: workspaceId,
        cid: -1,
        name: "No project",
        billable: false,
        is_private: false,
        active: true,
        template: false,
        at: new Date(),
        created_at: new Date(),
        color: "",
        auto_estimates: false,
        actual_hours: 0,
        hex_color: "",
      });
      return projects;
    },
    createTimeEntry: ({
      projectId,
      description,
      tags,
      billable,
    }: {
      projectId?: number;
      description: string;
      tags: string[];
      billable: boolean;
    }) => {
      return api.post<{ data: TimeEntry }>(`/time_entries/start`, {
        time_entry: {
          description,
          pid: projectId !== -1 ? projectId : undefined,
          billable,
          tags,
          created_with: "raycast-toggl-track",
        },
      });
    },
    getRunningTimeEntry: async (): Promise<TimeEntry | null> => {
      const { data } = await api.get<{ data: TimeEntry }>("/time_entries/current");
      return data;
    },
    getWorkspaceClients: (workspaceId: number): Promise<Client[] | null> => {
      return api.get<Client[] | null>(`/workspaces/${workspaceId}/clients`);
    },
    getWorkspaceTags: (workspaceId: number): Promise<Tag[] | null> => {
      return api.get<Tag[] | null>(`/workspaces/${workspaceId}/tags`);
    },
    stopTimeEntry: ({ id }: { id: number }) => {
      return api.put<{ data: TimeEntry }>(`/time_entries/${id}/stop`, {});
    },
    getTimeEntries: ({ startDate, endDate }: { startDate: Date; endDate: Date }) => {
      return api.get<TimeEntry[]>(
        `/time_entries?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`
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
