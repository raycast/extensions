import { mapSpace } from "../../mappers/spaces";
import { RawSpace, Space, UpdateSpaceRequest } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function updateSpace(spaceId: string, data: UpdateSpaceRequest): Promise<{ space: Space }> {
  const { url, method } = apiEndpoints.updateSpace(spaceId);

  const response = await apiFetch<{ space: RawSpace }>(url, {
    method: method,
    body: JSON.stringify(data),
  });

  return { space: await mapSpace(response.payload.space) };
}
