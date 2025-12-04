import { mapProperties } from "../../mappers/properties";
import { PaginatedResponse, Pagination, Property, RawProperty } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function getProperties(
  spaceId: string,
  options: { offset: number; limit: number },
): Promise<{
  properties: Property[];
  pagination: Pagination;
}> {
  const { url, method } = apiEndpoints.getProperties(spaceId, options);
  const response = await apiFetch<PaginatedResponse<RawProperty>>(url, { method: method });

  return {
    properties: response.payload.data ? mapProperties(response.payload.data) : [],
    pagination: response.payload.pagination,
  };
}
