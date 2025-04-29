import { mapObjects } from "../../mappers/objects";
import { PaginatedResponse, RawSpaceObject, SearchRequest, SpaceObject } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function globalSearch(
  SearchRequest: SearchRequest,
  options: { offset: number; limit: number },
): Promise<PaginatedResponse<SpaceObject>> {
  const { url, method } = apiEndpoints.globalSearch(options);
  const response = await apiFetch<PaginatedResponse<RawSpaceObject>>(url, {
    method: method,
    body: JSON.stringify(SearchRequest),
  });

  return {
    data: response.payload.data ? await mapObjects(response.payload.data) : [],
    pagination: response.payload.pagination,
  };
}
