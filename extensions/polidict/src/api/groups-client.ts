import type { Group, GroupList, UnsavedGroup } from "../types";
import { RestClient } from "./rest-client";

export interface EditGroupRequest {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  accessType?: string | null;
}

export class GroupsClient {
  constructor(private readonly restClient: RestClient) {}

  async queryGroups(
    languageCode: string,
    nameQuery?: string,
    pageParams?: { page?: number; pageSize?: number },
  ): Promise<GroupList> {
    const params: Record<string, string> = {};

    if (nameQuery) {
      params.name = nameQuery;
    }
    if (pageParams?.page) {
      params.page = (pageParams.page - 1).toString();
    }
    if (pageParams?.pageSize) {
      params.pageSize = pageParams.pageSize.toString();
    }

    const searchParams = new URLSearchParams(params);
    const queryString = searchParams.toString();
    const endpoint = `/api/languages/${languageCode}/groups${queryString ? `?${queryString}` : ""}`;

    return this.restClient.get<GroupList>(endpoint);
  }

  async getGroup(languageCode: string, groupId: string): Promise<Group> {
    return this.restClient.get<Group>(`/api/languages/${languageCode}/groups/${groupId}`);
  }

  async createGroup(languageCode: string, group: UnsavedGroup): Promise<Group> {
    return this.restClient.post<Group>(`/api/languages/${languageCode}/groups`, group);
  }

  async editGroup(languageCode: string, groupId: string, request: EditGroupRequest): Promise<Group> {
    return this.restClient.put<Group>(`/api/languages/${languageCode}/groups/${groupId}`, request);
  }

  async deleteGroup(languageCode: string, groupId: string): Promise<void> {
    return this.restClient.delete<void>(`/api/languages/${languageCode}/groups/${groupId}`);
  }
}
