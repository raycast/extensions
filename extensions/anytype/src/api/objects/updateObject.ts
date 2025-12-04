import { mapObject } from "../../mappers/objects";
import { RawSpaceObject, SpaceObject, UpdateObjectRequest } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function updateObject(
  spaceId: string,
  objectId: string,
  request: UpdateObjectRequest,
): Promise<{ object: SpaceObject }> {
  const { url, method } = apiEndpoints.updateObject(spaceId, objectId);

  const response = await apiFetch<{ object: RawSpaceObject }>(url, {
    method: method,
    body: JSON.stringify(request),
  });

  return { object: await mapObject(response.payload.object) };
}
