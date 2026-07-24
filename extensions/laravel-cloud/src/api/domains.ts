import { apiGet, apiPost, apiDelete } from "./client";
import { PaginatedResponse, SingleResponse } from "../types/api";
import { Domain, DomainRedirect, DomainVerificationMethod } from "../types/domain";

export async function listDomains(
  environmentId: string,
  filters?: { name?: string; hostname_status?: string; ssl_status?: string; origin_status?: string },
  include?: string,
): Promise<PaginatedResponse<Domain>> {
  const params: Record<string, string> = { per_page: "100" };
  if (include) params.include = include;
  if (filters?.name) params["filter[name]"] = filters.name;
  if (filters?.hostname_status) params["filter[hostname_status]"] = filters.hostname_status;
  if (filters?.ssl_status) params["filter[ssl_status]"] = filters.ssl_status;
  if (filters?.origin_status) params["filter[origin_status]"] = filters.origin_status;

  return apiGet<PaginatedResponse<Domain>>(`/environments/${environmentId}/domains`, params);
}

export async function getDomain(id: string, include?: string): Promise<SingleResponse<Domain>> {
  const params: Record<string, string> = {};
  if (include) params.include = include;

  return apiGet<SingleResponse<Domain>>(`/domains/${id}`, params);
}

export async function createDomain(
  environmentId: string,
  data: {
    name: string;
    www_redirect?: DomainRedirect;
    wildcard_enabled?: boolean;
    verification_method?: DomainVerificationMethod;
  },
): Promise<SingleResponse<Domain>> {
  return apiPost<SingleResponse<Domain>>(`/environments/${environmentId}/domains`, data as Record<string, unknown>);
}

export async function verifyDomain(id: string): Promise<SingleResponse<Domain>> {
  return apiPost<SingleResponse<Domain>>(`/domains/${id}/verify`);
}

export async function deleteDomain(id: string): Promise<void> {
  return apiDelete(`/domains/${id}`);
}
