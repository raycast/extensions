import { apiFetch } from "../helpers/api";
import { apiEndpoints } from "../helpers/constants";
import { mapObject } from "../helpers/mappers/objects";
import { SpaceObject } from "../helpers/schemas";

export async function getObject(
  spaceId: string,
  object_id: string,
): Promise<{
  object: SpaceObject | null;
}> {
  const { url, method } = apiEndpoints.getObject(spaceId, object_id);
  const response = await apiFetch<{ object: SpaceObject }>(url, { method: method });

  return {
    object: response ? await mapObject(response.object) : null,
  };
}
