import { mapObjects } from "../../mappers/objects";
import { PaginatedResponse, Pagination, RawSpaceObject, SpaceObject } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function getObjectsInList(
  spaceId: string,
  listId: string,
  viewId: string,
  options: { offset: number; limit: number; name?: string },
): Promise<{
  objects: SpaceObject[];
  pagination: Pagination;
}> {
  const { url, method } = apiEndpoints.getObjectsInList(spaceId, listId, viewId, options);
  const response = await apiFetch<PaginatedResponse<RawSpaceObject>>(url, { method: method });

  return {
    objects: response.payload.data ? await mapObjects(response.payload.data) : [],
    pagination: response.payload.pagination,
  };
}
