import { apiGet } from "./client";
import { PaginatedResponse, SingleResponse } from "../types/api";
import { Application } from "../types/application";

export async function listApplications(
  filters?: { name?: string; region?: string; slug?: string },
  include?: string,
): Promise<PaginatedResponse<Application>> {
  const params: Record<string, string> = { per_page: "100" };
  if (include) params.include = include;
  if (filters?.name) params["filter[name]"] = filters.name;
  if (filters?.region) params["filter[region]"] = filters.region;
  if (filters?.slug) params["filter[slug]"] = filters.slug;

  return apiGet<PaginatedResponse<Application>>("/applications", params);
}

export async function getApplication(id: string, include?: string): Promise<SingleResponse<Application>> {
  const params: Record<string, string> = {};
  if (include) params.include = include;

  return apiGet<SingleResponse<Application>>(`/applications/${id}`, params);
}
