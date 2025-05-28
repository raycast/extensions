import { mapTag } from "../../mappers/properties";
import { RawTag, Tag, UpdateTagRequest } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function updateTag(
  spaceId: string,
  propertyId: string,
  tagId: string,
  data: UpdateTagRequest,
): Promise<{ tag: Tag }> {
  const { url, method } = apiEndpoints.updateTag(spaceId, propertyId, tagId);

  const response = await apiFetch<{ tag: RawTag }>(url, {
    method: method,
    body: JSON.stringify(data),
  });

  return { tag: mapTag(response.payload.tag) };
}
