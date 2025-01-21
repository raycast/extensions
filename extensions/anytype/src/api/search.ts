import { apiFetch } from "../helpers/api";
import { apiEndpoints } from "../helpers/constants";
import { SpaceObject, PaginatedResponse } from "../helpers/schemas";
import { mapObjects } from "../helpers/mappers/objects";

export async function search(
  query: string,
  types: string[],
  options: { offset: number; limit: number },
): Promise<PaginatedResponse<SpaceObject>> {
  const { url, method } = apiEndpoints.search(query, types, options);
  const response = await apiFetch<PaginatedResponse<SpaceObject>>(url, { method: method });

  return {
    data: response.data ? await mapObjects(response.data) : [],
    pagination: response.pagination,
  };
}
