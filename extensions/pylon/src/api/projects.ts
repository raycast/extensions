import { post } from "./client";
import type { Project, Milestone, PaginatedResponse, SearchRequest } from "./types";

export async function getProjectsByAccount(accountId: string): Promise<Project[]> {
  const searchRequest: SearchRequest = {
    filters: { account_id: { equals: accountId } },
  };
  const response = await post<PaginatedResponse<Project>>("/projects/search", searchRequest);
  return response.data;
}

export async function getMilestonesByProject(projectId: string): Promise<Milestone[]> {
  const searchRequest: SearchRequest = {
    filters: { project_id: { equals: projectId } },
  };
  const response = await post<PaginatedResponse<Milestone>>("/milestones/search", searchRequest);
  return response.data;
}
