import { apiFetch } from "../helpers/api";
import { apiEndpoints } from "../helpers/constants";
import { SpaceObject, PaginatedResponse, SearchRequest } from "../helpers/schemas";
import { mapObjects } from "../mappers/objects";

export async function search(
  spaceId: string,
  SearchRequest: SearchRequest,
  options: { offset: number; limit: number },
): Promise<PaginatedResponse<SpaceObject>> {
  const { url, method } = apiEndpoints.search(spaceId, options);
  const response = await apiFetch<PaginatedResponse<SpaceObject>>(url, {
    method: method,
    body: JSON.stringify(SearchRequest),
  });

  return {
    data: response.data ? await mapObjects(response.data) : [],
    pagination: response.pagination,
  };
}
