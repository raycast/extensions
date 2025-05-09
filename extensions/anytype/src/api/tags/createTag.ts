import { mapTag } from "../../mappers/properties";
import { CreateTagRequest, RawTag, Tag } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function createTag(
  spaceId: string,
  propertyId: string,
  tagData: CreateTagRequest,
): Promise<{ tag: Tag | null }> {
  const { url, method } = apiEndpoints.createTag(spaceId, propertyId);

  const response = await apiFetch<{ tag: RawTag }>(url, {
    method: method,
    body: JSON.stringify(tagData),
  });

  return {
    tag: response ? mapTag(response.payload.tag) : null,
  };
}
