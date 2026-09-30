import { api } from "../api";
import type { ListRepositoriesParams, ListUserRepositoriesParams } from "../api/repositories";
import type { PaginatedResult } from ".";
import type { Repository } from "../types/api";

export async function getRepositories(params: ListRepositoriesParams = {}): Promise<PaginatedResult<Repository>> {
  const items = await api.repositories.list(params);
  return toPaginatedResult(items, params.limit);
}

export async function getUserRepositories(
  params: ListUserRepositoriesParams = {},
): Promise<PaginatedResult<Repository>> {
  const items = await api.repositories.listUser(params);
  return toPaginatedResult(items, params.limit);
}

function toPaginatedResult<T>(items: T[], limit?: number): PaginatedResult<T> {
  return { items, hasMore: typeof limit === "number" && items.length === limit };
}
