import { apiGet, apiPatch, apiPost } from "./client";
import { PaginatedResponse, SingleResponse } from "../types/api";
import { Environment, EnvironmentVariable, EnvironmentVariablesInsertMethod } from "../types/environment";
import { LogsResponse } from "../types/log";

export async function listEnvironments(
  applicationId: string,
  filters?: { name?: string; status?: string; slug?: string },
  include?: string,
): Promise<PaginatedResponse<Environment>> {
  const params: Record<string, string> = { per_page: "100" };
  if (include) params.include = include;
  if (filters?.name) params["filter[name]"] = filters.name;
  if (filters?.status) params["filter[status]"] = filters.status;
  if (filters?.slug) params["filter[slug]"] = filters.slug;

  return apiGet<PaginatedResponse<Environment>>(`/applications/${applicationId}/environments`, params);
}

export async function getEnvironment(id: string, include?: string): Promise<SingleResponse<Environment>> {
  const params: Record<string, string> = {};
  if (include) params.include = include;

  return apiGet<SingleResponse<Environment>>(`/environments/${id}`, params);
}

export async function updateEnvironment(
  id: string,
  data: Record<string, unknown>,
): Promise<SingleResponse<Environment>> {
  return apiPatch<SingleResponse<Environment>>(`/environments/${id}`, data);
}

export async function addEnvironmentVariables(
  environmentId: string,
  variables: EnvironmentVariable[],
  method: EnvironmentVariablesInsertMethod = "set",
): Promise<SingleResponse<Environment>> {
  return apiPost<SingleResponse<Environment>>(`/environments/${environmentId}/variables`, {
    method,
    variables,
  });
}

export async function deleteEnvironmentVariables(
  environmentId: string,
  keys: string[],
): Promise<SingleResponse<Environment>> {
  return apiPost<SingleResponse<Environment>>(`/environments/${environmentId}/variables/delete`, {
    keys,
  });
}

export async function getEnvironmentLogs(
  environmentId: string,
  options?: { query?: string; type?: string; cursor?: string; from?: string; to?: string },
): Promise<LogsResponse> {
  const params: Record<string, string> = {};
  if (options?.query) params.query = options.query;
  if (options?.type) params.type = options.type;
  if (options?.cursor) params.cursor = options.cursor;
  if (options?.from) params.from = options.from;
  if (options?.to) params.to = options.to;

  return apiGet<LogsResponse>(`/environments/${environmentId}/logs`, params);
}

export async function startEnvironment(id: string, redeploy?: boolean): Promise<void> {
  await apiPost(`/environments/${id}/start`, redeploy !== undefined ? { redeploy } : undefined);
}

export async function stopEnvironment(id: string): Promise<void> {
  await apiPost(`/environments/${id}/stop`);
}
