import { apiGet, apiPost, apiPatch, apiDelete } from "./client";
import { PaginatedResponse, SingleResponse } from "../types/api";
import { BackgroundProcess } from "../types/background-process";

export async function listBackgroundProcesses(
  instanceId: string,
  include?: string,
): Promise<PaginatedResponse<BackgroundProcess>> {
  const params: Record<string, string> = { per_page: "100" };
  if (include) params.include = include;

  return apiGet<PaginatedResponse<BackgroundProcess>>(`/instances/${instanceId}/background-processes`, params);
}

export async function createBackgroundProcess(
  instanceId: string,
  data: Record<string, unknown>,
): Promise<SingleResponse<BackgroundProcess>> {
  return apiPost<SingleResponse<BackgroundProcess>>(`/instances/${instanceId}/background-processes`, data);
}

export async function updateBackgroundProcess(
  id: string,
  data: Record<string, unknown>,
): Promise<SingleResponse<BackgroundProcess>> {
  return apiPatch<SingleResponse<BackgroundProcess>>(`/background-processes/${id}`, data);
}

export async function deleteBackgroundProcess(id: string): Promise<void> {
  return apiDelete(`/background-processes/${id}`);
}
