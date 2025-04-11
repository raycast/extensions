import { apiFetch } from "../helpers/api";
import { apiEndpoints } from "../helpers/constants";
import { SpaceObject } from "../helpers/schemas";

export async function deleteObject(spaceId: string, objectId: string): Promise<void> {
  const { url, method } = apiEndpoints.deleteObject(spaceId, objectId);

  await apiFetch<SpaceObject>(url, {
    method: method,
  });
}
