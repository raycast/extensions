import { getPreferenceValues } from "@raycast/api";
import fetch, { RequestInit } from "node-fetch";
// https://engineering.toggl.com/docs/api/time_entries/#post-timeentries
const { togglApiToken } = getPreferenceValues<{ togglApiToken: string }>();

const BASE_URL = "https://api.track.toggl.com/api/v9";

interface Organization {
  id: number;
  name: string;
}

interface Workspace {
  id: number;
  name: string;
}

interface Project {
  id: number;
  name: string;
  workspace_id: number;
}

interface Task {
  id: number;
  name: string;
  project_id: number;
}

class TogglAPI {
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const endpointUrl = `${BASE_URL}${endpoint}`;
    console.log(`Requesting ${endpointUrl}`);

    const response = await fetch(endpointUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${this.apiToken}:api_token`).toString("base64")}`,
        ...(options.headers as Record<string, string>),
      },
    });

    if (!response.ok) {
      console.error(`Request failed with status ${response.statusText}`);
      throw new Error(`Request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
  }

  async getOrganizations(): Promise<Organization[]> {
    return this.request<Organization[]>("/organizations");
  }

  async getWorkspaces(organizationId: number): Promise<Workspace[]> {
    return this.request<Workspace[]>(
      `/organizations/${organizationId}/workspaces`,
    );
  }

  async getProjects(workspaceId: number): Promise<Project[]> {
    return this.request<Project[]>(`/workspaces/${workspaceId}/projects`);
  }

  async getTasks(workspaceId: number, projectId: number): Promise<Task[]> {
    return this.request<Task[]>(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
    );
  }

  async getCurrentTimer(): Promise<{
    id: number;
    workspace_id: number;
  } | null> {
    return this.request<{ id: number; workspace_id: number } | null>(
      "/me/time_entries/current",
    );
  }

  async stopTimer(workspaceId: number, timerId: number): Promise<void> {
    await this.request(
      `/workspaces/${workspaceId}/time_entries/${timerId}/stop`,
      {
        method: "PATCH",
      },
    );
  }

  async startTimeEntry(
    workspaceId: number,
    description: string,
    projectId?: number,
    taskId?: number,
  ): Promise<void> {
    const body = {
      created_with: "Raycast Lilohass Extension",
      description,
      tags: [],
      billable: false,
      workspace_id: workspaceId,
      project_id: projectId,
      task_id: taskId,
      duration: -1, // A value of -1 indicates a running timer
      start: new Date().toISOString(),
    };

    await this.request(`/workspaces/${workspaceId}/time_entries`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}

export default new TogglAPI(togglApiToken);
