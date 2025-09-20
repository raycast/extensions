import { mapObjects } from "../../mappers/objects";
import { PaginatedResponse, Pagination, RawSpaceObject, SpaceObject } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function getTemplates(
  spaceId: string,
  typeId: string,
  options: {
    offset: number;
    limit: number;
  },
): Promise<{
  templates: SpaceObject[];
  pagination: Pagination;
}> {
  const { url, method } = apiEndpoints.getTemplates(spaceId, typeId, options);
  const response = await apiFetch<PaginatedResponse<RawSpaceObject>>(url, { method: method });

  return {
    templates: response.payload.data ? await mapObjects(response.payload.data) : [],
    pagination: response.payload.pagination,
  };
}
