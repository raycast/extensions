import { apiFetch } from "../helpers/api";
import { apiEndpoints } from "../helpers/constants";

export async function createSpace(objectData: { name: string }): Promise<void> {
  const { url, method } = apiEndpoints.createSpace;

  await apiFetch(url, {
    method: method,
    body: JSON.stringify({ name: objectData.name }),
  });
}
