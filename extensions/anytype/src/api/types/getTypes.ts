import { mapTypes } from "../../mappers/types";
import { PaginatedResponse, Pagination, RawType, Type } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

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
  const response = await apiFetch<PaginatedResponse<RawType>>(url, { method: method });

  return {
    types: response.payload.data ? await mapTypes(response.payload.data) : [],
    pagination: response.payload.pagination,
  };
}
