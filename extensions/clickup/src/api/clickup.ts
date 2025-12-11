import { captureException, getPreferenceValues } from "@raycast/api";

import type {
  ClickUpAuthenticatedUser,
  ClickUpFolder,
  ClickUpList,
  ClickUpSpace,
  ClickUpTask,
  GetAuthenticatedUserResponse,
  GetFoldersResponse,
  GetListsResponse,
  GetSpacesResponse,
  GetTasksParams,
  GetTasksResponse,
  UpdateTaskParams,
} from "../types/clickup";
import type { DocItem, DocsResponse } from "../types/docs.dt";
import type { DocPageItem } from "../types/doc-pages.dt";
import type { TeamItem, TeamsResponse } from "../types/teams.dt";

interface CreateTaskData {
  description?: string;
  due_date?: number;
  due_date_time?: boolean;
  name: string;
  priority?: number;
  status?: string;
}

/**
 * Unified ClickUp API client using native fetch.
 * Supports both v2 and v3 API endpoints.
 */
class ClickUpClient {
  private apiToken: string;
  private listId: string;
  private baseURL = "https://api.clickup.com/api";

  constructor() {
    const prefs = getPreferenceValues<Preferences>();
    this.apiToken = prefs.token;
    this.listId = prefs.listId;
  }

  /**
   * Make an API request to ClickUp
   */
  private async request<T>(endpoint: string, options?: RequestInit, version: 2 | 3 = 2): Promise<T> {
    const url = `${this.baseURL}/v${version}${endpoint}`;
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

    if (response.status === 401) {
      throw new Error("Invalid API token. Check your ClickUp API token in extension preferences.");
    }

    if (response.status === 404) {
      throw new Error("Resource not found. Check your team/space/list/task ID.");
    }

    if (!response.ok) {
      let errorMessage = `ClickUp API Error (${response.status})`;
      try {
        const errorData = (await response.json()) as {
          err?: string;
          ECODE?: string;
        };
        if (errorData.err) {
          errorMessage += `: ${errorData.err}`;
          if (errorData.ECODE) {
            errorMessage += ` (${errorData.ECODE})`;
          }
        }
      } catch {
        const errorText = await response.text();
        if (errorText) {
          errorMessage += `: ${errorText}`;
        }
      }
      const error = new Error(errorMessage);
      captureException(error);
      throw error;
    }

    return (await response.json()) as T;
  }

  /**
   * Build query parameters for task fetching
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
   * Get all teams/workspaces for the authenticated user
   */
  async getTeams(): Promise<TeamItem[]> {
    const response = await this.request<TeamsResponse>("/team");
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
   * Get all lists in a space (folderless)
   */
  async getLists(spaceId: string): Promise<ClickUpList[]> {
    const response = await this.request<GetListsResponse>(`/space/${spaceId}/list?archived=false`);
    return response.lists;
  }

  /**
   * Get all lists in a folder
   */
  async getFolderLists(folderId: string): Promise<ClickUpList[]> {
    const response = await this.request<GetListsResponse>(`/folder/${folderId}/list?archived=false`);
    return response.lists;
  }

  /**
   * Get a single list by ID (includes statuses)
   */
  async getList(listId: string): Promise<ClickUpList> {
    return await this.request<ClickUpList>(`/list/${listId}`);
  }

  /**
   * Get the default list ID from preferences
   */
  getDefaultListId(): string {
    return this.listId;
  }

  /**
   * Get tasks from a list (single page)
   */
  async getTasks(listId: string, params?: GetTasksParams): Promise<ClickUpTask[]> {
    const queryParams = this.buildTaskQueryParams(params);
    const response = await this.request<GetTasksResponse>(`/list/${listId}/task?${queryParams.toString()}`);
    return response.tasks;
  }

  /**
   * Get all tasks from a list (handles pagination automatically)
   */
  async getAllTasks(listId: string, params?: Omit<GetTasksParams, "page">): Promise<ClickUpTask[]> {
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
   * Get all tasks from default list with nested subtasks
   */
  async getAllTasksRecursively(listId: string, params?: Omit<GetTasksParams, "page">): Promise<ClickUpTask[]> {
    return this.getAllTasks(listId, { ...params, subtasks: true });
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string): Promise<ClickUpTask> {
    return this.request<ClickUpTask>(`/task/${taskId}`);
  }

  /**
   * Get task details (alias for getTask for backward compatibility)
   */
  async getTaskDetails(taskId: string): Promise<ClickUpTask> {
    return this.getTask(taskId);
  }

  /**
   * Create a new task
   */
  async createTask(listId: string, data: CreateTaskData): Promise<ClickUpTask> {
    return this.request<ClickUpTask>(`/list/${listId}/task`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, updates: UpdateTaskParams): Promise<ClickUpTask> {
    return this.request<ClickUpTask>(`/task/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
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
   * Get all docs for a workspace/team
   */
  async getDocs(teamId: string): Promise<DocItem[]> {
    const response = await this.request<DocsResponse>(`/workspaces/${teamId}/docs`, undefined, 3);
    return response.docs;
  }

  /**
   * Get pages for a doc
   */
  async getDocPages(workspaceId: string, docId: string): Promise<DocPageItem[]> {
    return this.request<DocPageItem[]>(`/workspaces/${workspaceId}/docs/${docId}/pages`, undefined, 3);
  }
}

let clientInstance: ClickUpClient | null = null;

/**
 * Get the shared ClickUp client instance
 */
export function getClickUpClient(): ClickUpClient {
  if (!clientInstance) {
    clientInstance = new ClickUpClient();
  }
  return clientInstance;
}

/**
 * Reset the client instance (useful for testing or preference changes)
 */
export function resetClickUpClient(): void {
  clientInstance = null;
}
