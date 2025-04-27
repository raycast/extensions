import { RawSpaceObject } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function deleteObject(spaceId: string, objectId: string): Promise<void> {
  const { url, method } = apiEndpoints.deleteObject(spaceId, objectId);

  await apiFetch<RawSpaceObject>(url, {
    method: method,
  });
}
