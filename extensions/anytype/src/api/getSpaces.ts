import { mapSpaces } from "../mappers/spaces";
import { PaginatedResponse, Pagination, RawSpace, Space } from "../models";
import { apiEndpoints, apiFetch } from "../utils";

export async function getSpaces(options: { offset: number; limit: number }): Promise<{
  spaces: Space[];
  pagination: Pagination;
}> {
  const { url, method } = apiEndpoints.getSpaces(options);
  const response = await apiFetch<PaginatedResponse<RawSpace>>(url, { method: method });

  return {
    spaces: response.payload.data ? await mapSpaces(response.payload.data) : [],
    pagination: response.payload.pagination,
  };
}
