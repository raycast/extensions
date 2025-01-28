import { apiFetch } from "../helpers/api";
import { apiEndpoints } from "../helpers/constants";
import { Type, PaginatedResponse } from "../helpers/schemas";
import { mapTypes } from "../mappers/types";
import { Pagination } from "../helpers/schemas";

export async function getTypes(
  spaceId: string,
  options: {
    offset: number;
    limit: number;
  },
): Promise<{
  types: Type[];
  pagination: Pagination;
}> {
  const { url, method } = apiEndpoints.getTypes(spaceId, options);
  const response = await apiFetch<PaginatedResponse<Type>>(url, { method: method });

  return {
    types: response.data ? await mapTypes(response.data) : [],
    pagination: response.pagination,
  };
}
