import { mapObject } from "../../mappers/objects";
import { CreateObjectRequest, RawSpaceObject, SpaceObject } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function createObject(spaceId: string, request: CreateObjectRequest): Promise<{ object: SpaceObject }> {
  const { url, method } = apiEndpoints.createObject(spaceId);

  const response = await apiFetch<{ object: RawSpaceObject }>(url, {
    method: method,
    body: JSON.stringify(request),
  });

  return { object: await mapObject(response.payload.object) };
}
