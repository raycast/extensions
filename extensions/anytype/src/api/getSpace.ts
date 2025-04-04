import { mapSpace } from "../mappers/spaces";
import { RawSpace, Space } from "../models";
import { apiEndpoints, apiFetch } from "../utils";

export async function getSpace(spaceId: string): Promise<{
  space: Space | null;
}> {
  const { url, method } = apiEndpoints.getSpace(spaceId);
  const response = await apiFetch<{ space: RawSpace }>(url, { method: method });
  return {
    space: response ? await mapSpace(response.payload.space) : null,
  };
}
