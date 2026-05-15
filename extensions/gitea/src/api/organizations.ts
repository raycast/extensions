import type { Organization } from "../types/api";
import type { PaginatedResult } from "./common";
import { getClient } from "./client";

export type ListOrganizationsParams = { page?: number; limit?: number };

export async function listOrganizations(params?: ListOrganizationsParams): Promise<Organization[]> {
  const client = getClient();
  const { data } = await client.rest.organization.orgGetAll(params);
  return data;
}

export async function getOrganizations(params?: ListOrganizationsParams): Promise<PaginatedResult<Organization>> {
  const items = await listOrganizations(params);
  return { items, hasMore: typeof params?.limit === "number" && items.length === params.limit };
}
