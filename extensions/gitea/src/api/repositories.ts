import type { Repository } from "../types/api";
import { getClient } from "./client";
import type { GiteaRepositorySortKey } from "../domain/repository-sort";
import type { SortOrder } from "../domain/options";
import { DEFAULT_PAGE_SIZE } from "../constants";

/**
 * Parameters for repoSearch endpoint - supports server-side sorting.
 * Used by Explore Repositories command.
 */
export type ListRepositoriesParams = {
  limit?: number;
  page?: number;
  sort?: GiteaRepositorySortKey;
  order?: SortOrder;
};

/**
 * Search repositories across all accessible repositories.
 * Supports server-side sorting via sort/order parameters.
 */
export async function listRepositories(params: ListRepositoriesParams = {}): Promise<Repository[]> {
  const client = getClient();
  const { limit = DEFAULT_PAGE_SIZE, page, sort, order } = params;
  const { data, error } = await client.GET("/repos/search", {
    params: { query: { limit, ...(page ? { page } : {}), ...(sort ? { sort } : {}), ...(order ? { order } : {}) } },
  });
  if (error) throw new Error("Failed to fetch repositories");
  if (!data?.ok) throw new Error("Search failed for repositories");
  return data?.data ?? [];
}

export type ListUserRepositoriesParams = { limit?: number; page?: number };

export async function listUserRepositories(params: ListUserRepositoriesParams = {}): Promise<Repository[]> {
  const client = getClient();
  const { limit = DEFAULT_PAGE_SIZE, page } = params;
  const { data, error } = await client.GET("/user/repos", {
    params: { query: { limit, ...(page ? { page } : {}) } },
  });
  if (error) throw new Error("Failed to fetch user repositories");
  return data ?? [];
}
