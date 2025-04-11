import { apiFetch } from "../helpers/api";
import { apiEndpoints } from "../helpers/constants";
import { CreateObjectRequest } from "../helpers/schemas";

export async function createObject(spaceId: string, objectData: CreateObjectRequest): Promise<void> {
  const { url, method } = apiEndpoints.createObject(spaceId);

  await apiFetch(url, {
    method: method,
    body: JSON.stringify(objectData),
  });
}
