import type { Repository } from "../types/api";
import type { PaginatedResult } from "./common";
import { getClient } from "./client";

export type ListRepositoriesParams = { limit?: number; page?: number; sort?: string; order?: "asc" | "desc" };
export type ListUserRepositoriesParams = { limit?: number; page?: number };
export async function listRepositories(params: ListRepositoriesParams = {}): Promise<Repository[]> {
  const client = getClient();
  const { limit = 20, page, sort, order } = params;
  const { data } = await client.rest.repository.repoSearch({
    limit,
    ...(page ? { page } : {}),
    ...(sort ? { sort } : {}),
    ...(order ? { order } : {}),
  });
  if (!data?.ok) throw new Error("Search failed for repositories");
  return data?.data ?? [];
}

export async function getRepositories(params: ListRepositoriesParams = {}): Promise<PaginatedResult<Repository>> {
  const items = await listRepositories(params);
  return { items, hasMore: typeof params.limit === "number" && items.length === params.limit };
}

export async function listUserRepositories(params: ListUserRepositoriesParams = {}): Promise<Repository[]> {
  const client = getClient();
  const { limit, page } = params;
  const { data } = await client.rest.user.userCurrentListRepos({
    ...(typeof limit === "number" ? { limit } : {}),
    ...(typeof page === "number" ? { page } : {}),
  });
  return data as Repository[];
}

export async function getUserRepositories(
  params: ListUserRepositoriesParams = {},
): Promise<PaginatedResult<Repository>> {
  const items = await listUserRepositories(params);
  return { items, hasMore: typeof params.limit === "number" && items.length === params.limit };
}
