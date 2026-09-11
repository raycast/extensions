import { apiGet, apiPost } from "./client";
import { PaginatedResponse, SingleResponse } from "../types/api";
import { Deployment, DeploymentLogs } from "../types/deployment";

export async function listDeployments(
  environmentId: string,
  filters?: { status?: string; branch_name?: string; commit_hash?: string },
  include?: string,
): Promise<PaginatedResponse<Deployment>> {
  const params: Record<string, string> = { per_page: "100" };
  if (include) params.include = include;
  if (filters?.status) params["filter[status]"] = filters.status;
  if (filters?.branch_name) params["filter[branch_name]"] = filters.branch_name;
  if (filters?.commit_hash) params["filter[commit_hash]"] = filters.commit_hash;

  return apiGet<PaginatedResponse<Deployment>>(`/environments/${environmentId}/deployments`, params);
}

export async function getDeployment(id: string, include?: string): Promise<SingleResponse<Deployment>> {
  const params: Record<string, string> = {};
  if (include) params.include = include;

  return apiGet<SingleResponse<Deployment>>(`/deployments/${id}`, params);
}

export async function getDeploymentLogs(id: string): Promise<DeploymentLogs> {
  return apiGet<DeploymentLogs>(`/deployments/${id}/logs`);
}

export async function triggerDeployment(environmentId: string): Promise<SingleResponse<Deployment>> {
  return apiPost<SingleResponse<Deployment>>(`/environments/${environmentId}/deployments`);
}
