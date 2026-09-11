import { apiGet } from "./client";
import { PaginatedResponse } from "../types/api";
import { Instance } from "../types/instance";

export async function listInstances(
  environmentId: string,
  filters?: { name?: string; type?: string; size?: string; scaling_type?: string },
  include?: string,
): Promise<PaginatedResponse<Instance>> {
  const params: Record<string, string> = { per_page: "100" };
  if (include) params.include = include;
  if (filters?.name) params["filter[name]"] = filters.name;
  if (filters?.type) params["filter[type]"] = filters.type;
  if (filters?.size) params["filter[size]"] = filters.size;
  if (filters?.scaling_type) params["filter[scaling_type]"] = filters.scaling_type;

  return apiGet<PaginatedResponse<Instance>>(`/environments/${environmentId}/instances`, params);
}
