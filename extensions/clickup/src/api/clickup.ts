import { getPreferenceValues } from "@raycast/api";
import {
  ClickUpDoc,
  ClickUpDocPage,
  ClickUpErrorResponse,
  ClickUpFolder,
  ClickUpList,
  ClickUpSpace,
  ClickUpTask,
  ClickUpTeam,
  CreateTaskParams,
} from "../types/clickup";

interface GetDocsResponse {
  docs: ClickUpDoc[];
}

interface GetDocPagesResponse {
  pages: ClickUpDocPage[];
}

interface GetFoldersResponse {
  folders: ClickUpFolder[];
}

interface GetListsResponse {
  lists: ClickUpList[];
}

interface GetSpacesResponse {
  spaces: ClickUpSpace[];
}

interface GetTasksResponse {
  tasks: ClickUpTask[];
}

interface GetTeamsResponse {
  teams: ClickUpTeam[];
}

class ClickUpClient {
  private apiToken: string;

  constructor() {
    const { token } = getPreferenceValues<Preferences>();
    this.apiToken = token;
  }

  private async request<T>(endpoint: string, options?: RequestInit, apiVersion: 2 | 3 = 2): Promise<T> {
    const baseURL = `https://api.clickup.com/api/v${apiVersion}`;
    const url = `${baseURL}${endpoint}`;
    const headers = {
      Authorization: this.apiToken,
      "Content-Type": "application/json",
      ...options?.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const waitTime = retryAfter ? parseInt(retryAfter, 10) : 60;
      throw new Error(`Rate limit exceeded. Please try again in ${waitTime} seconds.`);
    }

    if (!response.ok) {
      let errorMessage = `ClickUp API Error (${response.status})`;
      try {
        const errorData = (await response.json()) as ClickUpErrorResponse;
        errorMessage = `${errorData.err} (${errorData.ECODE})`;
      } catch {
        const errorText = await response.text();
        if (errorText) {
          errorMessage += `: ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    return (await response.json()) as T;
  }

  /**
   * Get all teams/workspaces for the authenticated user
   */
  async getTeams(): Promise<ClickUpTeam[]> {
    const response = await this.request<GetTeamsResponse>("/team");
    return response.teams;
  }

  /**
   * Get all spaces for a team
   */
  async getSpaces(teamId: string): Promise<ClickUpSpace[]> {
    const response = await this.request<GetSpacesResponse>(`/team/${teamId}/space?archived=false`);
    return response.spaces;
  }

  /**
   * Get all folders in a space
   */
  async getFolders(spaceId: string): Promise<ClickUpFolder[]> {
    const response = await this.request<GetFoldersResponse>(`/space/${spaceId}/folder?archived=false`);
    return response.folders;
  }

  /**
   * Get all lists in a folder
   */
  async getLists(folderId: string): Promise<ClickUpList[]> {
    const response = await this.request<GetListsResponse>(`/folder/${folderId}/list?archived=false`);
    return response.lists;
  }

  /**
   * Get folderless lists in a space
   */
  async getFolderlessLists(spaceId: string): Promise<ClickUpList[]> {
    const response = await this.request<GetListsResponse>(`/space/${spaceId}/list?archived=false`);
    return response.lists;
  }

  /**
   * Get a single list by ID (includes statuses)
   */
  async getList(listId: string): Promise<ClickUpList> {
    return this.request<ClickUpList>(`/list/${listId}`);
  }

  /**
   * Get all tasks in a list
   */
  async getTasks(listId: string): Promise<ClickUpTask[]> {
    const response = await this.request<GetTasksResponse>(`/list/${listId}/task?archived=false`);
    return response.tasks;
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string, includeSubtasks = true): Promise<ClickUpTask> {
    const query = includeSubtasks ? "?include_subtasks=true" : "";
    return this.request<ClickUpTask>(`/task/${taskId}${query}`);
  }

  /**
   * Create a new task in a list
   */
  async createTask(listId: string, data: CreateTaskParams): Promise<ClickUpTask> {
    return this.request<ClickUpTask>(`/list/${listId}/task`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Get all docs in a workspace (v3 API)
   */
  async getDocs(workspaceId: string): Promise<ClickUpDoc[]> {
    const response = await this.request<GetDocsResponse>(`/workspaces/${workspaceId}/docs`, undefined, 3);
    return response.docs;
  }

  /**
   * Get all pages in a doc (v3 API)
   */
  async getDocPages(workspaceId: string, docId: string): Promise<ClickUpDocPage[]> {
    const response = await this.request<GetDocPagesResponse>(
      `/workspaces/${workspaceId}/docs/${docId}/pages`,
      undefined,
      3,
    );
    return response.pages;
  }
}

let clientInstance: ClickUpClient | null = null;

export function getClickUpClient(): ClickUpClient {
  if (!clientInstance) {
    clientInstance = new ClickUpClient();
  }
  return clientInstance;
}
