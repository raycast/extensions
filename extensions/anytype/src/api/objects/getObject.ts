import { mapObject } from "../../mappers/objects";
import { mapType } from "../../mappers/types";
import { RawSpaceObjectWithBlocks, SpaceObject } from "../../models";
import { apiEndpoints, apiFetch, getIconWithFallback } from "../../utils";

export async function getObject(
  spaceId: string,
  objectId: string,
): Promise<{
  object: SpaceObject | null;
}> {
  const { url, method } = apiEndpoints.getObject(spaceId, objectId);
  const response = await apiFetch<{ object: RawSpaceObjectWithBlocks }>(url, { method: method });
  return {
    object: response ? await mapObject(response.payload.object) : null,
  };
}

export async function getObjectWithoutMappedDetails(spaceId: string, objectId: string): Promise<SpaceObject | null> {
  const { url, method } = apiEndpoints.getObject(spaceId, objectId);
  const response = await apiFetch<{ object: RawSpaceObjectWithBlocks }>(url, { method });
  if (!response) {
    return null;
  }

  const { object } = response.payload;
  const icon = await getIconWithFallback(object.icon, object.layout, object.type);

  return {
    ...object,
    icon,
    name: object.name || "Untitled",
    type: await mapType(object.type),
  };
}
