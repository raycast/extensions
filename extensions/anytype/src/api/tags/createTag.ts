import { mapTag } from "../../mappers/properties";
import { CreateTagRequest, RawTag, Tag } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function createTag(
  spaceId: string,
  propertyId: string,
  request: CreateTagRequest,
): Promise<{ tag: Tag | null }> {
  const { url, method } = apiEndpoints.createTag(spaceId, propertyId);

  const response = await apiFetch<{ tag: RawTag }>(url, {
    method: method,
    body: JSON.stringify(request),
  });

  return {
    tag: response ? mapTag(response.payload.tag) : null,
  };
}
