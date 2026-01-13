import fetch, { RequestInit } from "node-fetch";
import {
  ClickUpList,
  ClickUpFolder,
  ClickUpMember,
  CreateTaskPayload,
  Preferences,
} from "../types";

const BASE_URL = "https://api.clickup.com/api/v2";

export class ClickUpAPI {
  private apiToken: string;
  private workspaceId: string;
  private spaceId?: string;

  constructor(preferences: Preferences) {
    this.apiToken = preferences.apiToken;
    this.workspaceId = preferences.workspaceId;
    this.spaceId = preferences.spaceId;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.apiToken,
        "Content-Type": "application/json",
        ...(options?.headers as Record<string, string>),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ClickUp API Error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  async getLists(): Promise<ClickUpList[]> {
    interface ListsResponse {
      lists: ClickUpList[];
    }

    interface FoldersResponse {
      folders: ClickUpFolder[];
    }

    if (this.spaceId) {
      const [listsResponse, foldersResponse] = await Promise.all([
        this.request<ListsResponse>(`/space/${this.spaceId}/list`),
        this.request<FoldersResponse>(`/space/${this.spaceId}/folder`),
      ]);

      const folderlessLists = listsResponse.lists;
      const folderLists = foldersResponse.folders.flatMap((folder) =>
        (folder.lists || []).map((list) => ({
          ...list,
          folder: { id: folder.id, name: folder.name },
        })),
      );

      return [...folderlessLists, ...folderLists];
    }

    // Fallback for workspace level
    const response = await this.request<ListsResponse>(
      `/team/${this.workspaceId}/list`,
    );
    return response.lists;
  }

  async getWorkspaceMembers(): Promise<ClickUpMember[]> {
    interface TeamResponse {
      team?: {
        id: string;
        name: string;
        members?: ClickUpMember[];
      };
    }

    try {
      const response = await this.request<TeamResponse>(
        `/team/${this.workspaceId}`,
      );
      return response.team?.members || [];
    } catch (error) {
      console.error("Error fetching workspace members:", error);
      return [];
    }
  }

  async createTask(listId: string, payload: CreateTaskPayload): Promise<void> {
    await this.request(`/list/${listId}/task`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}
