import { apiGet, apiPost, apiDelete } from "./client";
import { PaginatedResponse, SingleResponse } from "../types/api";
import { Cache, CacheTypeOption } from "../types/cache";

export async function listCacheTypes(): Promise<{ data: CacheTypeOption[] }> {
  return apiGet<{ data: CacheTypeOption[] }>("/caches/types");
}

export async function listCaches(filters?: {
  name?: string;
  type?: string;
  status?: string;
  region?: string;
}): Promise<PaginatedResponse<Cache>> {
  const params: Record<string, string> = { per_page: "100" };
  if (filters?.name) params["filter[name]"] = filters.name;
  if (filters?.type) params["filter[type]"] = filters.type;
  if (filters?.status) params["filter[status]"] = filters.status;
  if (filters?.region) params["filter[region]"] = filters.region;

  return apiGet<PaginatedResponse<Cache>>("/caches", params);
}

export async function createCache(data: Record<string, unknown>): Promise<SingleResponse<Cache>> {
  return apiPost<SingleResponse<Cache>>("/caches", data);
}

export async function deleteCache(id: string): Promise<void> {
  return apiDelete(`/caches/${id}`);
}
