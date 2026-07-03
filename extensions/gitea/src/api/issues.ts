import { getClient } from "./client";
import type { Issue, Label, Milestone, User } from "../types/api";
import { throwApiError } from "./errors";

export type IssueListParams = {
  state?: "open" | "closed" | "all";
  labels?: string;
  milestones?: string;
  q?: string;
  priority_repo_id?: number;
  type?: "issues" | "pulls";
  since?: string;
  before?: string;
  assigned?: boolean;
  created?: boolean;
  mentioned?: boolean;
  review_requested?: boolean;
  reviewed?: boolean;
  owner?: string;
  team?: string;
  page?: number;
  limit?: number;
};

export async function searchIssues(params: IssueListParams = {}): Promise<Issue[]> {
  const client = getClient();
  const { data, error, response } = await client.GET("/repos/issues/search", { params: { query: params } });
  if (error) throwApiError("Failed to fetch issues", error, response);
  return data ?? [];
}

export type ListRepoIssuesParams = {
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
  type?: "issues" | "pulls";
  labels?: string;
  milestones?: string;
  q?: string;
  since?: string;
  before?: string;
  page?: number;
  limit?: number;
};

export async function listRepoIssues(params: ListRepoIssuesParams): Promise<Issue[]> {
  const client = getClient();
  const { owner, repo, ...query } = params;
  const { data, error, response } = await client.GET("/repos/{owner}/{repo}/issues", {
    params: { path: { owner, repo }, query },
  });
  if (error) throwApiError("Failed to fetch repository issues", error, response);
  return data ?? [];
}

export type ListRepoLabelsParams = {
  owner: string;
  repo: string;
};

export async function listRepoLabels(params: ListRepoLabelsParams): Promise<Label[]> {
  const client = getClient();
  const { data, error, response } = await client.GET("/repos/{owner}/{repo}/labels", {
    params: { path: { owner: params.owner, repo: params.repo } },
  });
  if (error) throwApiError("Failed to fetch labels", error, response);
  return data ?? [];
}

export type ListRepoMilestonesParams = {
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
};

export async function listRepoMilestones(params: ListRepoMilestonesParams): Promise<Milestone[]> {
  const client = getClient();
  const { data, error, response } = await client.GET("/repos/{owner}/{repo}/milestones", {
    params: { path: { owner: params.owner, repo: params.repo }, query: { state: params.state ?? "open" } },
  });
  if (error) throwApiError("Failed to fetch milestones", error, response);
  return data ?? [];
}

export type ListRepoAssigneesParams = {
  owner: string;
  repo: string;
};

export async function listRepoAssignees(params: ListRepoAssigneesParams): Promise<User[]> {
  const client = getClient();
  const { data, error, response } = await client.GET("/repos/{owner}/{repo}/assignees", {
    params: { path: { owner: params.owner, repo: params.repo } },
  });
  if (error) throwApiError("Failed to fetch assignees", error, response);
  return data ?? [];
}

export type CreateIssueParams = {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  labels?: number[];
  milestone?: number;
  assignees?: string[];
  due_date?: string;
  ref?: string;
};

export async function createIssue(params: CreateIssueParams): Promise<Issue> {
  const client = getClient();
  const { owner, repo, ...body } = params;
  const { data, error, response } = await client.POST("/repos/{owner}/{repo}/issues", {
    params: { path: { owner, repo } },
    body,
  });
  if (error) throwApiError("Failed to create issue", error, response);
  if (!data) throw new Error("No issue returned from server");
  return data;
}
