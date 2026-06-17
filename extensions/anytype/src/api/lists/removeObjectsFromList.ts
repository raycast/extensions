import { apiEndpoints, apiFetch } from "../../utils";

export async function removeObjectsFromList(spaceId: string, listId: string, objectIds: string[]): Promise<void> {
  for (const objectId of objectIds) {
    const { url, method } = apiEndpoints.removeObjectsFromList(spaceId, listId, objectId);
    await apiFetch(url, {
      method: method,
    });
  }
}
