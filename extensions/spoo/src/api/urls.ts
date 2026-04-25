import { apiFetch } from "@/api/client";
import { getApiBaseUrl } from "@/constants";
import {
  AliasAvailabilitySchema,
  UrlListResponseSchema,
  UrlResponseSchema,
  type AliasAvailability,
  type CreateUrlRequest,
  type UpdateUrlRequest,
  type UrlListItem,
  type UrlListResponse,
  type UrlResponse,
  type UrlStatus,
} from "@/schemas/url";

export type SortField = "created_at" | "last_click" | "total_clicks";
export type SortOrder = "asc" | "desc";

export interface ListUrlsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: UrlStatus;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

export async function shortenUrl(body: CreateUrlRequest): Promise<UrlResponse> {
  return apiFetch("/api/v1/shorten", {
    method: "POST",
    body,
    schema: UrlResponseSchema,
  });
}

export async function checkAlias(alias: string): Promise<AliasAvailability> {
  return apiFetch("/api/v1/shorten/check-alias", {
    query: { alias },
    schema: AliasAvailabilitySchema,
  });
}

export async function listUrls(
  options: ListUrlsOptions = {},
): Promise<UrlListResponse> {
  const { search, status, ...rest } = options;
  const filter = buildFilter({ search, status });
  const parsed = await apiFetch("/api/v1/urls", {
    query: {
      page: rest.page ?? 1,
      pageSize: rest.pageSize ?? 50,
      sortBy: rest.sortBy ?? "created_at",
      sortOrder: rest.sortOrder ?? "desc",
      filter,
    },
    schema: UrlListResponseSchema,
  });

  const base = getApiBaseUrl();
  return {
    ...parsed,
    items: parsed.items.map((item) => hydrate(item, base)),
  };
}

export async function updateUrl(
  id: string,
  body: UpdateUrlRequest,
): Promise<UrlResponse> {
  return apiFetch(`/api/v1/urls/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
    schema: UrlResponseSchema,
  });
}

export async function setUrlStatus(
  id: string,
  status: UrlStatus,
): Promise<UrlResponse> {
  return apiFetch(`/api/v1/urls/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status },
    schema: UrlResponseSchema,
  });
}

export async function deleteUrl(id: string): Promise<void> {
  await apiFetch(`/api/v1/urls/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

function hydrate(
  item: Omit<UrlListItem, "short_url">,
  base: string,
): UrlListItem {
  return {
    ...item,
    short_url: item.alias ? `${base}/${item.alias}` : base,
  };
}

function buildFilter(filter: {
  search?: string;
  status?: UrlStatus;
}): string | undefined {
  const payload: Record<string, unknown> = {};
  if (filter.search) payload.search = filter.search;
  if (filter.status) payload.status = filter.status;
  return Object.keys(payload).length ? JSON.stringify(payload) : undefined;
}
