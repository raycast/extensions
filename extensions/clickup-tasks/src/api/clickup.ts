import { getPreferenceValues } from "@raycast/api";
import {
  ClickUpErrorResponse,
  GetTasksParams,
  ClickUpTask,
  GetTasksResponse,
  UpdateTaskParams,
  ClickUpAuthenticatedUser,
  GetAuthenticatedUserResponse,
  GetSpacesResponse,
  GetListsResponse,
  GetFoldersResponse,
  ClickUpSpace,
  ClickUpList,
  ClickUpFolder,
} from "../types/clickup";

class ClickUpClient {
  private apiToken: string;
  private listId: string;
  private baseURL = "https://api.clickup.com/api/v2";

  constructor() {
    const { clickupApiToken, listId } = getPreferenceValues<ExtensionPreferences>();
    this.apiToken = clickupApiToken;
    this.listId = listId;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
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
        errorMessage += `: ${errorData.err} (${errorData.ECODE})`;
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
   * Build query parameters for getTasks
   */
  private buildTaskQueryParams(params?: GetTasksParams): URLSearchParams {
    const queryParams = new URLSearchParams();

    queryParams.set("archived", String(params?.archived ?? false));

    if (!params) return queryParams;

    const arrayParams = new Set(["statuses", "assignees", "tags"]);

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || key === "archived") continue;

      if (Array.isArray(value)) {
        if (value.length === 0) continue;

        if (key === "custom_fields") {
          for (const [index, cf] of value.entries()) {
            queryParams.append(`custom_fields[${index}][field_id]`, cf.field_id);
            queryParams.append(`custom_fields[${index}][operator]`, cf.operator);
            queryParams.append(`custom_fields[${index}][value]`, String(cf.value));
          }
        } else if (arrayParams.has(key)) {
          for (const item of value) {
            queryParams.append(`${key}[]`, String(item));
          }
        }
      } else {
        queryParams.set(key, String(value));
      }
    }

    return queryParams;
  }

  /**
   * Get tasks from the configured list (single page)
   */
  async getTasks(params?: GetTasksParams): Promise<ClickUpTask[]> {
    const queryParams = this.buildTaskQueryParams(params);
    const response = await this.request<GetTasksResponse>(`/list/${this.listId}/task?${queryParams.toString()}`);
    return response.tasks;
  }

  /**
   * Get all tasks from the configured list (handles pagination automatically)
   */
  async getAllTasks(params?: Omit<GetTasksParams, "page">): Promise<ClickUpTask[]> {
    const allTasks: ClickUpTask[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const queryParams = this.buildTaskQueryParams({ ...params, page });
      const response = await this.request<GetTasksResponse>(`/list/${this.listId}/task?${queryParams.toString()}`);

      allTasks.push(...response.tasks);

      hasMore = response.tasks.length === 100;
      page++;
    }

    return allTasks;
  }

  /**
   * Get all tasks from a specific list ID (handles pagination automatically)
   */
  async getAllTasksFromList(listId: string, params?: Omit<GetTasksParams, "page">): Promise<ClickUpTask[]> {
    const allTasks: ClickUpTask[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const queryParams = this.buildTaskQueryParams({ ...params, page });
      const response = await this.request<GetTasksResponse>(`/list/${listId}/task?${queryParams.toString()}`);

      allTasks.push(...response.tasks);

      hasMore = response.tasks.length === 100;
      page++;
    }

    return allTasks;
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, updates: UpdateTaskParams): Promise<ClickUpTask> {
    return this.request<ClickUpTask>(`/task/${taskId}`, {
      body: JSON.stringify(updates),
      method: "PUT",
    });
  }

  /**
   * Get the authenticated user's information
   */
  async getAuthenticatedUser(): Promise<ClickUpAuthenticatedUser> {
    const response = await this.request<GetAuthenticatedUserResponse>("/user");
    return response.user;
  }

  /**
   * Get all teams/workspaces for the authenticated user
   */
  async getTeams(): Promise<Array<{ id: string; name: string }>> {
    const response = await this.request<{ teams: Array<{ id: string; name: string }> }>("/team");
    return response.teams;
  }

  /**
   * Get all spaces/workspaces for the authenticated user's team
   */
  async getSpaces(teamId: string): Promise<ClickUpSpace[]> {
    const response = await this.request<GetSpacesResponse>(`/team/${teamId}/space`);
    return response.spaces;
  }

  /**
   * Get all lists in a space (not in folders)
   */
  async getSpaceLists(spaceId: string): Promise<ClickUpList[]> {
    const response = await this.request<GetListsResponse>(`/space/${spaceId}/list`);
    return response.lists;
  }

  /**
   * Get all folders in a space
   */
  async getSpaceFolders(spaceId: string): Promise<ClickUpFolder[]> {
    const response = await this.request<GetFoldersResponse>(`/space/${spaceId}/folder`);
    return response.folders;
  }

  /**
   * Get all lists in a folder
   */
  async getFolderLists(folderId: string): Promise<ClickUpList[]> {
    const response = await this.request<GetListsResponse>(`/folder/${folderId}/list`);
    return response.lists;
  }

  /**
   * Get a single list by ID (includes statuses)
   */
  async getList(listId: string): Promise<ClickUpList> {
    return await this.request<ClickUpList>(`/list/${listId}`);
  }
}

let clientInstance: ClickUpClient | null = null;

export function getClickUpClient(): ClickUpClient {
  if (!clientInstance) {
    clientInstance = new ClickUpClient();
  }
  return clientInstance;
}
