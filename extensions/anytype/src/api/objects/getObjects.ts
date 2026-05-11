import { mapObjects } from "../../mappers/objects";
import { PaginatedResponse, Pagination, RawSpaceObject, SpaceObject } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function getObjects(
  spaceId: string,
  options: { offset: number; limit: number; name?: string },
): Promise<{
  objects: SpaceObject[];
  pagination: Pagination;
}> {
  const { url, method } = apiEndpoints.getObjects(spaceId, options);
  const response = await apiFetch<PaginatedResponse<RawSpaceObject>>(url, { method: method });

  return {
    objects: response.payload.data ? await mapObjects(response.payload.data) : [],
    pagination: response.payload.pagination,
  };
}
