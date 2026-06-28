import { apiGet, apiPost, apiDelete } from "./client";
import { PaginatedResponse, SingleResponse } from "../types/api";
import { DatabaseCluster, DatabaseSchema, DatabaseSnapshot, DatabaseTypeOption } from "../types/database";

export async function listDatabaseTypes(): Promise<{ data: DatabaseTypeOption[] }> {
  return apiGet<{ data: DatabaseTypeOption[] }>("/databases/types");
}

export async function listDatabaseClusters(
  filters?: { name?: string; type?: string; status?: string; region?: string },
  include?: string,
): Promise<PaginatedResponse<DatabaseCluster>> {
  const params: Record<string, string> = { per_page: "100" };
  if (include) params.include = include;
  if (filters?.name) params["filter[name]"] = filters.name;
  if (filters?.type) params["filter[type]"] = filters.type;
  if (filters?.status) params["filter[status]"] = filters.status;
  if (filters?.region) params["filter[region]"] = filters.region;

  return apiGet<PaginatedResponse<DatabaseCluster>>("/databases/clusters", params);
}

export async function createDatabaseCluster(data: Record<string, unknown>): Promise<SingleResponse<DatabaseCluster>> {
  return apiPost<SingleResponse<DatabaseCluster>>("/databases/clusters", data);
}

export async function deleteDatabaseCluster(id: string): Promise<void> {
  return apiDelete(`/databases/clusters/${id}`);
}

export async function listDatabaseSchemas(
  clusterId: string,
  include?: string,
): Promise<PaginatedResponse<DatabaseSchema>> {
  const params: Record<string, string> = { per_page: "100" };
  if (include) params.include = include;

  return apiGet<PaginatedResponse<DatabaseSchema>>(`/databases/clusters/${clusterId}/databases`, params);
}

export async function createDatabaseSchema(
  clusterId: string,
  data: { name: string },
): Promise<SingleResponse<DatabaseSchema>> {
  return apiPost<SingleResponse<DatabaseSchema>>(
    `/databases/clusters/${clusterId}/databases`,
    data as Record<string, unknown>,
  );
}

export async function deleteDatabaseSchema(clusterId: string, schemaId: string): Promise<void> {
  return apiDelete(`/databases/clusters/${clusterId}/databases/${schemaId}`);
}

export async function listDatabaseSnapshots(
  clusterId: string,
  include?: string,
): Promise<PaginatedResponse<DatabaseSnapshot>> {
  const params: Record<string, string> = { per_page: "100" };
  if (include) params.include = include;

  return apiGet<PaginatedResponse<DatabaseSnapshot>>(`/databases/clusters/${clusterId}/snapshots`, params);
}

export async function createDatabaseSnapshot(
  clusterId: string,
  data: { name: string; description?: string },
): Promise<SingleResponse<DatabaseSnapshot>> {
  return apiPost<SingleResponse<DatabaseSnapshot>>(
    `/databases/clusters/${clusterId}/snapshots`,
    data as Record<string, unknown>,
  );
}

export async function createDatabaseRestore(clusterId: string, data: Record<string, unknown>): Promise<void> {
  await apiPost(`/databases/clusters/${clusterId}/restore`, data);
}
