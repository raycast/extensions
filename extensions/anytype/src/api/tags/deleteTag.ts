import { mapTag } from "../../mappers/properties";
import { RawTag, Tag } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function deleteTag(spaceId: string, propertyId: string, tagId: string): Promise<Tag> {
  const { url, method } = apiEndpoints.deleteTag(spaceId, propertyId, tagId);

  const response = await apiFetch<{ tag: RawTag }>(url, {
    method: method,
  });

  return mapTag(response.payload.tag);
}
