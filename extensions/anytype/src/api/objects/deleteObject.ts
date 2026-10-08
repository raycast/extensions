import { mapObject } from "../../mappers/objects";
import { RawSpaceObject, SpaceObject } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function deleteObject(spaceId: string, objectId: string): Promise<SpaceObject> {
  const { url, method } = apiEndpoints.deleteObject(spaceId, objectId);

  const response = await apiFetch<{ object: RawSpaceObject }>(url, {
    method: method,
  });

  return await mapObject(response.payload.object);
}
