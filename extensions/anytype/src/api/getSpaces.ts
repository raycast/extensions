import { apiFetch } from "../helpers/api";
import { apiEndpoints } from "../helpers/constants";
import { mapSpaces } from "../helpers/mappers/spaces";
import { Space, Pagination, PaginatedResponse } from "../helpers/schemas";

export async function getSpaces(options: { offset: number; limit: number }): Promise<{
  spaces: Space[];
  pagination: Pagination;
}> {
  const { url, method } = apiEndpoints.getSpaces(options);
  const response = await apiFetch<PaginatedResponse<Space>>(url, { method: method });

  return {
    spaces: response.data ? await mapSpaces(response.data) : [],
    pagination: response.pagination,
  };
}
