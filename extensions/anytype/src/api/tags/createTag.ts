import { mapTag } from "../../mappers/properties";
import { CreateTagRequest, RawTag, Tag } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function createTag(spaceId: string, propertyId: string, request: CreateTagRequest): Promise<{ tag: Tag }> {
  const { url, method } = apiEndpoints.createTag(spaceId, propertyId);

  const response = await apiFetch<{ tag: RawTag }>(url, {
    method: method,
    body: JSON.stringify(request),
  });

  return { tag: mapTag(response.payload.tag) };
}
