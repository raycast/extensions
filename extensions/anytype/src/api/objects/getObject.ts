import { mapObject } from "../../mappers/objects";
import { mapType } from "../../mappers/types";
import { BodyFormat, RawSpaceObjectWithBody, SpaceObjectWithBody } from "../../models";
import { apiEndpoints, apiFetch, getIconWithFallback, getNameWithFallback } from "../../utils";

export async function getObject(
  spaceId: string,
  objectId: string,
  format: BodyFormat,
): Promise<{ object: SpaceObjectWithBody }> {
  const { url, method } = apiEndpoints.getObject(spaceId, objectId, format);
  const response = await apiFetch<{ object: RawSpaceObjectWithBody }>(url, { method: method });
  return { object: (await mapObject(response.payload.object)) as SpaceObjectWithBody };
}

export async function getRawObject(
  spaceId: string,
  objectId: string,
  format: BodyFormat,
): Promise<{ object: RawSpaceObjectWithBody }> {
  const { url, method } = apiEndpoints.getObject(spaceId, objectId, format);
  const response = await apiFetch<{ object: RawSpaceObjectWithBody }>(url, { method });
  return { object: response.payload.object };
}

export async function getObjectWithoutMappedProperties(
  spaceId: string,
  objectId: string,
  format: BodyFormat,
): Promise<SpaceObjectWithBody> {
  const { url, method } = apiEndpoints.getObject(spaceId, objectId, format);
  const response = await apiFetch<{ object: RawSpaceObjectWithBody }>(url, { method });

  const { object } = response.payload;
  const icon = await getIconWithFallback(object.icon, object.layout, object.type);

  return {
    ...object,
    icon,
    name: getNameWithFallback(object.name),
    type: await mapType(object.type),
    properties: [], // performance optimization
    markdown: "", // performance optimization
  };
}
